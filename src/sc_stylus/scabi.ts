const abi = [
  "function initializeAdmin() external",
  "function setAddress(address _token) external",
  "function changeAdmin(address new_admin) external",
  "function deposit(uint256 amount) external returns (bool)",
  "function payWorkers((address,uint256)[] memory workers, uint256 _total) external returns (bool)",
  "function autoPayWorkers(address employer, (address,uint256)[] memory workers, uint256 _total) external returns (bool)",
  "function employerBalance(address employer) external view returns (uint256)",
  "function myBalance() external view returns (uint256)",
  "function tokenBalance(address owner) external view returns (uint256)",
  "function emergencyWithdraw(address employer_addres, uint256 _amount) external",
  "function balance() external view returns (uint256)",
  "function transferByEmployer(address _recipient, uint256 _amount) external returns (bool)",
  "error InsufficientBalance(uint256)",
];
//$MUSDC
const payWorkers = "0x21d9c6451a1907b555b012ef7292a879ab9ce33e";
const MockUSDC = "0x80f55661F53fa615249cBACF6C88a4399034B99D";

export { MockUSDC, abi, payWorkers };
