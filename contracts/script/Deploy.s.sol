// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {VaultFactory} from "../src/VaultFactory.sol";

contract DeployScript is Script {

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy VaultFactory
        VaultFactory vaultFactory = new VaultFactory();
        vm.stopBroadcast();

        console.log("VaultFactory deployed to:", address(vaultFactory));
    }
}
