---
title: "Web3 và smart contract"
description: "Khái niệm EVM, Solidity, chuẩn token ERC, Foundry/Hardhat, viem/ethers.js, bảo mật và tối ưu gas."
date: 2026-10-16
tags: [Web3, Solidity, Ethereum]
---

Tra cứu nhanh cho lập trình Web3 trên các chuỗi tương thích EVM (Ethereum, Base, Arbitrum, Polygon…): Solidity, chuẩn token, Foundry/Hardhat, viem/ethers.js và bảo mật.

## Khái niệm nền tảng

Mọi thay đổi trạng thái trên chuỗi đều là một transaction được ký bằng private key và tốn gas; đọc dữ liệu (call) thì miễn phí.

| Khái niệm | Ý nghĩa ngắn gọn |
| --- | --- |
| EVM | Máy ảo chạy bytecode của smart contract, giống nhau trên mọi chuỗi EVM |
| EOA | Tài khoản do người giữ private key điều khiển (ví MetaMask) |
| Contract account | Tài khoản chứa code, chỉ chạy khi được gọi |
| Address | 20 byte, dạng `0x…`, suy ra từ public key |
| Nonce | Số thứ tự transaction của một EOA, chống gửi lặp |
| Gas | Đơn vị đo khối lượng tính toán; phí = gasUsed × giá gas |
| Base fee / priority fee | EIP-1559: base fee bị đốt, priority fee (tip) trả cho validator |
| Wei / Gwei / Ether | 1 ETH = 10^9 Gwei = 10^18 wei |
| ABI | Mô tả hàm/event của contract để client mã hoá lời gọi |
| Event / log | Dữ liệu contract phát ra, rẻ, client đọc được nhưng contract không đọc lại được |
| L2 / rollup | Chuỗi chạy trên Ethereum, phí rẻ hơn (Arbitrum, Optimism, Base) |
| RPC | Endpoint JSON-RPC để đọc chuỗi và gửi transaction (Alchemy, Infura, node riêng) |

Vòng đời một transaction:

1. Client dựng tx (to, data, value, gas, nonce, chainId).
2. Ví ký tx bằng private key.
3. Gửi qua RPC (`eth_sendRawTransaction`) vào mempool.
4. Validator đưa tx vào block; EVM thực thi.
5. Có receipt (status, gasUsed, logs); chờ thêm vài block để chắc chắn (finality).

## Solidity

Solidity là ngôn ngữ chính cho smart contract EVM; dùng phiên bản 0.8.x để có sẵn kiểm tra tràn số.

Khung một contract:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Vault {
    // state variables (lưu trên storage, tốn gas khi ghi)
    address public owner;
    uint256 public constant FEE_BPS = 100;   // nhúng vào bytecode
    uint256 public immutable createdAt;      // gán 1 lần trong constructor
    mapping(address => uint256) public balances;

    event Deposited(address indexed user, uint256 amount);
    error NotOwner();
    error InsufficientBalance(uint256 have, uint256 want);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
        createdAt = block.timestamp;
    }

    function deposit() external payable {
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        uint256 bal = balances[msg.sender];
        if (bal < amount) revert InsufficientBalance(bal, amount);
        balances[msg.sender] = bal - amount;          // cập nhật trước
        (bool ok, ) = msg.sender.call{value: amount}(""); // gửi sau
        require(ok, "transfer failed");
    }

    receive() external payable {}   // nhận ETH không kèm data
}
```

| Nhóm | Cú pháp / ý nghĩa |
| --- | --- |
| Kiểu giá trị | `bool`, `uint8…uint256`, `int256`, `address`, `address payable`, `bytes1…bytes32`, `enum` |
| Kiểu tham chiếu | `string`, `bytes`, mảng `uint[]`, `struct`, `mapping(K => V)` |
| Vị trí dữ liệu | `storage` (lưu vĩnh viễn), `memory` (tạm trong hàm), `calldata` (tham số chỉ đọc, rẻ nhất) |
| Visibility | `public`, `external`, `internal`, `private` |
| State mutability | `view` (đọc), `pure` (không đọc/ghi), `payable` (nhận ETH) |
| Biến toàn cục | `msg.sender`, `msg.value`, `msg.data`, `block.timestamp`, `block.number`, `block.chainid`, `tx.origin` (đừng dùng để phân quyền) |
| Lỗi | `require(cond, "msg")`, `revert CustomError(args)`, `assert` (chỉ cho bất biến) |
| Kế thừa | `contract A is B, C`, `virtual` / `override`, `super.f()` |
| Interface | `interface IERC20 { function transfer(address,uint256) external returns (bool); }` |
| Library | `library SafeX {…}` + `using SafeX for uint256;` |
| Gửi ETH | `(bool ok,) = to.call{value: v}("");` — tránh `transfer`/`send` (giới hạn 2300 gas) |
| Băm / chữ ký | `keccak256(abi.encode(...))`, `ecrecover`, nên dùng `ECDSA` của OpenZeppelin |
| Mã hoá | `abi.encode`, `abi.encodePacked` (dễ va chạm hash khi nhiều tham số động), `abi.encodeWithSelector`, `abi.decode` |
| Đơn vị | `1 ether`, `1 gwei`, `1 days`, `1 hours` |
| Unchecked | `unchecked { i++; }` bỏ kiểm tra tràn để tiết kiệm gas khi chắc chắn an toàn |

Gọi contract khác:

```solidity
IERC20(token).transferFrom(msg.sender, address(this), amount);
(bool ok, bytes memory ret) = target.call(abi.encodeWithSignature("foo(uint256)", 42));
```

## Chuẩn token

Đừng tự viết token từ đầu: kế thừa OpenZeppelin Contracts (`npm i @openzeppelin/contracts` hoặc `forge install OpenZeppelin/openzeppelin-contracts`).

| Chuẩn | Dùng cho | Hàm chính |
| --- | --- | --- |
| ERC-20 | Token thay thế được (coin, điểm, stablecoin) | `balanceOf`, `transfer`, `approve`, `allowance`, `transferFrom` |
| ERC-721 | NFT, mỗi token duy nhất | `ownerOf`, `safeTransferFrom`, `approve`, `setApprovalForAll`, `tokenURI` |
| ERC-1155 | Nhiều loại token trong 1 contract (vật phẩm game) | `balanceOf(acc, id)`, `safeTransferFrom`, `safeBatchTransferFrom`, `uri` |
| ERC-2612 | `permit`: approve bằng chữ ký, không tốn tx riêng | `permit(owner, spender, value, deadline, v, r, s)` |
| ERC-4626 | Vault chia sẻ lợi nhuận | `deposit`, `withdraw`, `convertToShares` |

ERC-20:

```solidity
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract GameCoin is ERC20, Ownable {
    constructor() ERC20("Game Coin", "GC") Ownable(msg.sender) {
        _mint(msg.sender, 1_000_000 * 10 ** decimals()); // decimals mặc định 18
    }
    function mint(address to, uint256 amount) external onlyOwner { _mint(to, amount); }
}
```

ERC-721:

```solidity
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Hero is ERC721 {
    uint256 private _nextId;
    constructor() ERC721("Hero", "HERO") {}
    function mint() external returns (uint256 id) {
        id = _nextId++;
        _safeMint(msg.sender, id);
    }
    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://<CID>/"; // metadata JSON: name, description, image, attributes
    }
}
```

ERC-1155:

```solidity
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract Items is ERC1155 {
    uint256 public constant GOLD = 0;
    uint256 public constant SWORD = 1;
    constructor() ERC1155("https://api.example.com/item/{id}.json") {
        _mint(msg.sender, GOLD, 10_000, "");
        _mint(msg.sender, SWORD, 1, "");
    }
}
```

Module OpenZeppelin hay dùng: `Ownable`, `AccessControl` (vai trò), `Pausable`, `ReentrancyGuard`, `SafeERC20`, `ECDSA`, `MerkleProof`, `UUPSUpgradeable`.

## Công cụ: Foundry và Hardhat

Foundry viết test bằng Solidity và chạy rất nhanh; Hardhat viết test bằng TypeScript và hợp với dự án nặng về JS. Chọn một là đủ.

Foundry:

| Việc | Lệnh |
| --- | --- |
| Cài | `curl -L https://foundry.paradigm.xyz \| bash` rồi `foundryup` |
| Tạo dự án | `forge init my-project` |
| Cài thư viện | `forge install OpenZeppelin/openzeppelin-contracts` |
| Build | `forge build` |
| Test | `forge test -vvv` · lọc: `--match-test testWithdraw` · gas: `--gas-report` |
| Fuzz / coverage | hàm test có tham số tự thành fuzz · `forge coverage` |
| Node local | `anvil` (10 tài khoản có sẵn ETH, chain id 31337) |
| Fork mainnet | `anvil --fork-url $RPC_URL` |
| Deploy script | `forge script script/Deploy.s.sol --rpc-url $RPC_URL --account dev --broadcast --verify` |
| Ví bảo mật | `cast wallet import dev --interactive` (lưu key mã hoá, không để trong .env) |
| Đọc contract | `cast call $ADDR "balanceOf(address)(uint256)" $USER --rpc-url $RPC_URL` |
| Gửi tx | `cast send $ADDR "mint(address,uint256)" $USER 100 --account dev --rpc-url $RPC_URL` |
| Tiện ích | `cast to-wei 1 ether` · `cast sig "transfer(address,uint256)"` · `cast balance $ADDR` |

Test Foundry:

```solidity
import {Test} from "forge-std/Test.sol";

contract VaultTest is Test {
    Vault vault;
    address alice = makeAddr("alice");

    function setUp() public { vault = new Vault(); }

    function testDepositWithdraw() public {
        vm.deal(alice, 1 ether);          // cấp ETH
        vm.prank(alice);                  // tx tiếp theo do alice gửi
        vault.deposit{value: 1 ether}();
        assertEq(vault.balances(alice), 1 ether);
    }

    function testRevertNotEnough() public {
        vm.expectRevert();
        vm.prank(alice);
        vault.withdraw(1);
    }

    function testFuzz(uint96 amt) public {   // fuzz test
        vm.deal(alice, amt);
        vm.prank(alice);
        vault.deposit{value: amt}();
        assertEq(vault.balances(alice), amt);
    }
}
```

Cheatcode hay dùng: `vm.prank`, `vm.startPrank`/`stopPrank`, `vm.deal`, `vm.warp` (đổi timestamp), `vm.roll` (đổi block), `vm.expectRevert`, `vm.expectEmit`, `vm.envUint`.

Hardhat:

| Việc | Lệnh |
| --- | --- |
| Tạo dự án | `npx hardhat --init` (Hardhat 3) hoặc `npx hardhat init` (bản cũ) |
| Build / test | `npx hardhat compile` · `npx hardhat test` |
| Node local | `npx hardhat node` |
| Deploy (Ignition) | `npx hardhat ignition deploy ignition/modules/Vault.ts --network sepolia` |
| Verify | `npx hardhat verify --network sepolia <ADDR> <constructor args>` |
| Biến bí mật | `npx hardhat keystore set SEPOLIA_PRIVATE_KEY` thay vì để trong code |

## Frontend: viem và ethers.js

viem (kèm wagmi cho React) là lựa chọn phổ biến cho dự án mới; ethers.js v6 vẫn dùng rộng rãi. Cả hai đều cần ABI và địa chỉ contract.

viem — đọc, ghi, nghe event:

```ts
import { createPublicClient, createWalletClient, custom, http, parseEther, formatEther } from "viem";
import { sepolia } from "viem/chains";

const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC_URL) });
const walletClient = createWalletClient({ chain: sepolia, transport: custom(window.ethereum) });
const [account] = await walletClient.requestAddresses();   // mở MetaMask

// đọc (miễn phí)
const bal = await publicClient.readContract({
  address: TOKEN, abi, functionName: "balanceOf", args: [account],
});

// ghi: mô phỏng trước để bắt lỗi revert, rồi gửi
const { request } = await publicClient.simulateContract({
  account, address: VAULT, abi, functionName: "deposit", value: parseEther("0.01"),
});
const hash = await walletClient.writeContract(request);
const receipt = await publicClient.waitForTransactionReceipt({ hash });

// nghe event
publicClient.watchContractEvent({
  address: VAULT, abi, eventName: "Deposited",
  onLogs: (logs) => console.log(logs),
});
```

ethers.js v6 — tương đương:

```ts
import { BrowserProvider, Contract, parseEther, formatEther } from "ethers";

const provider = new BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const vault = new Contract(VAULT, abi, signer);

const bal = await vault.balances(await signer.getAddress());
const tx = await vault.deposit({ value: parseEther("0.01") });
await tx.wait();
vault.on("Deposited", (user, amount) => console.log(user, formatEther(amount)));
```

wagmi (React):

```tsx
const { address, isConnected } = useAccount();
const { connect, connectors } = useConnect();
const { data: bal } = useReadContract({ address: TOKEN, abi, functionName: "balanceOf", args: [address] });
const { writeContract } = useWriteContract();
writeContract({ address: VAULT, abi, functionName: "deposit", value: parseEther("0.01") });
```

| Việc | viem | ethers v6 |
| --- | --- | --- |
| ETH → wei | `parseEther("1")` | `parseEther("1")` |
| wei → ETH | `formatEther(x)` | `formatEther(x)` |
| Token có decimals | `parseUnits("5", 6)` | `parseUnits("5", 6)` |
| Kiểu số | `bigint` (`10n`) | `bigint` |
| Ký message | `walletClient.signMessage` | `signer.signMessage` |
| Ký typed data (EIP-712) | `signTypedData` | `signer.signTypedData` |

Kết nối ví nhiều loại: RainbowKit, ConnectKit, Reown AppKit (WalletConnect). Lưu trữ file/metadata: IPFS (Pinata, web3.storage) hoặc Arweave. Đọc dữ liệu lịch sử nhanh: indexer như The Graph hoặc Ponder.

## Bảo mật smart contract

Contract đã deploy không sửa được (trừ khi dùng proxy) và giữ tiền thật, nên một lỗi nhỏ có thể mất toàn bộ quỹ.

| Lỗi | Biểu hiện | Cách phòng |
| --- | --- | --- |
| Reentrancy | Contract ngoài gọi ngược lại trước khi state cập nhật | Checks-Effects-Interactions; `nonReentrant` |
| Thiếu phân quyền | Ai cũng gọi được `mint`, `withdraw`, `upgrade` | `onlyOwner` / `AccessControl`; test với tài khoản lạ |
| `tx.origin` để xác thực | Contract trung gian lừa người dùng | Dùng `msg.sender` |
| Thao túng oracle giá | Giá lấy từ 1 pool DEX bị flash loan đẩy lệch | Chainlink, TWAP, nhiều nguồn |
| Token ERC-20 không chuẩn | `transfer` không trả `bool` (USDT) | `SafeERC20.safeTransfer` |
| Front-running / MEV | Người khác thấy tx trong mempool và chen trước | Slippage, deadline, commit–reveal |
| Random dễ đoán | Dùng `block.timestamp`, `blockhash` làm số ngẫu nhiên | Chainlink VRF |
| Replay chữ ký | Chữ ký dùng lại nhiều lần hoặc trên chain khác | Nonce + chainId + domain EIP-712 |
| DoS bằng vòng lặp | Lặp qua mảng không giới hạn, hết gas | Pull-payment, phân trang |
| Lỗi proxy/upgrade | Xung đột storage layout, initializer chưa khoá | OpenZeppelin Upgrades, `_disableInitializers()` |
| Rò private key | Key trong repo hoặc `.env` bị lộ | Keystore mã hoá, ví cứng, multisig (Safe) cho admin |

Checklist trước khi lên mainnet:

- [ ] Test coverage cao, có fuzz và invariant test
- [ ] Chạy phân tích tĩnh: Slither, Aderyn
- [ ] Thử trên fork mainnet và testnet
- [ ] Quyền admin nằm ở multisig, có timelock nếu cần
- [ ] Verify source trên Etherscan/Blockscout
- [ ] Audit hoặc mở bug bounty với contract giữ tiền lớn

## Tối ưu gas, testnet và tài nguyên

Ghi storage là thao tác đắt nhất; phần lớn tối ưu gas là ghi ít lần hơn và đọc storage ít lần hơn.

Mẹo tối ưu gas:

- Cache biến storage vào biến local khi đọc nhiều lần trong hàm.
- Dùng `calldata` thay `memory` cho tham số mảng/chuỗi của hàm `external`.
- Dùng `constant` / `immutable` cho giá trị không đổi.
- Gom biến nhỏ (`uint128`, `uint64`, `address`, `bool`) cạnh nhau để chung 1 slot 32 byte.
- Dùng custom error thay chuỗi trong `require`.
- Phát event thay vì lưu dữ liệu chỉ để frontend đọc.
- `unchecked { ++i; }` trong vòng lặp có giới hạn rõ.
- Đo bằng `forge test --gas-report` và `forge snapshot` trước và sau khi sửa.

Testnet phổ biến (xin ETH thử từ faucet của Alchemy, Infura hoặc Google Cloud):

| Mạng | Chain ID | Ghi chú |
| --- | --- | --- |
| Ethereum Sepolia | 11155111 | Testnet chính cho dApp |
| Ethereum Holesky / Hoodi | 17000 / 560048 | Chủ yếu cho staking, validator |
| Base Sepolia | 84532 | L2 của Coinbase |
| Arbitrum Sepolia | 421614 | L2 Arbitrum |
| OP Sepolia | 11155420 | L2 Optimism |
| Anvil / Hardhat local | 31337 | Máy bạn, reset tuỳ ý |

Tài nguyên học:

- [Solidity docs](https://docs.soliditylang.org) — tài liệu ngôn ngữ
- [Solidity by Example](https://solidity-by-example.org) — ví dụ ngắn theo chủ đề
- [Foundry Book](https://book.getfoundry.sh) — Foundry, forge, cast, anvil
- [OpenZeppelin Docs](https://docs.openzeppelin.com/contracts) và [Contracts Wizard](https://wizard.openzeppelin.com) — sinh code token
- [viem](https://viem.sh) · [wagmi](https://wagmi.sh) · [ethers.js](https://docs.ethers.org)
- [Cyfrin Updraft](https://updraft.cyfrin.io) — khoá học miễn phí từ cơ bản đến audit
- [Ethernaut](https://ethernaut.openzeppelin.com) và [Damn Vulnerable DeFi](https://www.damnvulnerabledefi.xyz) — luyện tìm lỗi bảo mật
- [Remix IDE](https://remix.ethereum.org) — viết và deploy thử ngay trên trình duyệt

Lộ trình gợi ý: Remix + Solidity by Example → Foundry + OpenZeppelin → viem/wagmi làm một dApp nhỏ → Ethernaut để học bảo mật.

Ghi chú: lệnh và phiên bản công cụ (đặc biệt Hardhat 3, testnet) thay đổi nhanh; kiểm tra lại tài liệu chính thức khi cài đặt.
