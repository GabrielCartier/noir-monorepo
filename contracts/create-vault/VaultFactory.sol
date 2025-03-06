// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Vault.sol";

contract VaultFactory {
    address public owner;
    mapping(address => address[]) public userVaults;
    mapping(address => bool) public isVault;
    
    event VaultCreated(address indexed vault, address indexed token, address indexed owner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    function createVault(
        address token,
        string memory name,
        string memory description,
        string memory vaultType
    ) external returns (address) {
        Vault vault = new Vault(token, name, description, vaultType);
        address vaultAddress = address(vault);
        
        userVaults[msg.sender].push(vaultAddress);
        isVault[vaultAddress] = true;
        
        emit VaultCreated(vaultAddress, token, msg.sender);
        return vaultAddress;
    }

    function getUserVaults(address user) external view returns (address[] memory) {
        return userVaults[user];
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner address");
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }
} 