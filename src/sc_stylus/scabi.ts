const abi =[
    "function initializeAdmin() external",
    "function setAddress(address _token) external",
    "function changeAdmin(address new_admin) external",
    "function deposit(uint256 amount) external returns (bool)",
    "function payWorkers((address,uint256)[] memory workers) external returns (bool)",
    "function autoPayWorkers(address employer, (address,uint256)[] memory workers) external returns (bool)",
    "function employerBalance(address employer) external view returns (uint256)",
    "function myBalance() external view returns (uint256)",
    "function tokenBalance(address owner) external view returns (uint256)",
    "function emergencyWithdraw(uint256 _amount) external",
    "function balance() external view returns (uint256)"
]

const payWorkers = "0xb3a9b7bd51b6733964e59144a3ad90a85b34904f"