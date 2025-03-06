// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Vault} from "./Vault.sol";

contract VaultFactory {
    mapping(address => address) public userVault;

    event VaultCreated(address indexed vault, address indexed owner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error InvalidOwner();
    error InvalidAgent();
    error VaultAlreadyExists();

    function createVault(address owner, address agentAddress) external returns (address) {
        if (owner == address(0)) {
            revert InvalidOwner();
        }
        if (agentAddress == address(0)) {
            revert InvalidAgent();
        }
        if (userVault[owner] != address(0)) {
            revert VaultAlreadyExists();
        }

        Vault vault = new Vault(owner, agentAddress);
        address vaultAddress = address(vault);

        userVault[owner] = vaultAddress;
        emit VaultCreated(vaultAddress, owner);
        return vaultAddress;
    }

    function getUserVault(address user) external view returns (address) {
        return userVault[user];
    }
}
