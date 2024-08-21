const CHAIN_BSC_MAIN = {
    "chainId": 56,
    "chainName": "BNB Smart Chain",
    "rpcUrls": ["https://rpc.ankr.com/bsc"],
    "nativeCurrency": {"name": "BNB", "symbol": "BNB", "decimals": 18},
    "blockExplorerUrls": ["https://bscscan.com/"]
}
const CHAIN_BSC_TEST = {
    "chainId": 97,
    "chainName": "BNB Test Smart Chain",
    "rpcUrls": ["https://rpc.ankr.com/bsc_testnet_chapel"],
    "nativeCurrency": {"name": "BNB", "symbol": "BNB", "decimals": 18},
    "blockExplorerUrls": ["https://testnet.bscscan.com"]
}

const web3 = dapp.web3();
let isWeb3Connected = false;

async function connect() {
    const account = await dapp.requestAccounts();
    await dapp.addEthereumChain(CHAIN_BSC_TEST);
    // await dapp.addEthereumChain(CHAIN_BSC_MAIN);
    isWeb3Connected = true;
    return account;
}

connect().then((account) => {
    document.querySelector("#btn-connect").innerText = account;
    myNFT(account);
    myStakingNFT(account);
    take(true);
});


const _MINT = '0x04348415C083c79fCBC0D3f9EC14767838Ba3BAF';
const _NTF = '0x6c54B8e46c836cc898A52A4D6b0c316035874406';
const _Staking = '0x770AEaE82e29F1ebd09AdA86c88ccDe6309b2525';

function myNFT(account) {
    const data = web3.eth.abi.encodeFunctionCall({name: 'tokenIds', type: 'function', inputs: [{name: "account", type: "address"}]}, [account]);
    dapp.ethCall(_NTF, data).then(function (result) {
        const values = web3.eth.abi.decodeParameters([{type: 'uint256[]', name: 'tokenIds'},], result);
        // const select = document.getElementById("my-nft");
        // console.log(select);
        // while (select.options.length > 0) {
        //     select.options.remove(0);
        // }
        console.log(values.tokenIds);
        // values.tokenIds.forEach(function (tokenId) {
        //     const o = new Option(tokenId, tokenId);
        //     select.options.add(o);
        // });
    });
}

function myStakingNFT(account) {
    const data = web3.eth.abi.encodeFunctionCall({name: 'tokenIds', type: 'function', inputs: [{name: "account", type: "address"}]}, [account]);
    dapp.ethCall(_Staking, data).then(function (result) {
        const values = web3.eth.abi.decodeParameters([{type: 'uint256[]', name: 'tokenIds'},], result);
        // const select = document.getElementById("staking-nft");
        // console.log(select);
        // while (select.options.length > 0) {
        //     select.options.remove(0);
        // }
        console.log(values.tokenIds);
        // values.tokenIds.forEach(function (tokenId) {
        //     const o = new Option(tokenId, tokenId);
        //     select.options.add(o);
        // });
    });
}

function mint(level) {
    let value = 0;
    if (level === 1) {
        value = 0.5;
    } else if (level === 2) {
        value = 1;
    } else if (level === 3) {
        value = 5;
    } else if (level === 4) {
        value = 10;
    }
    const data = web3.eth.abi.encodeFunctionCall({name: 'mint', type: 'function',}, []);
    dapp.sendTransaction(_MINT, dapp.toWei(value), data).then(function (result) {
        console.log(result);
    })
}

async function approveNFT(tokenId) {
    const data = web3.eth.abi.encodeFunctionCall({name: 'approve', type: 'function', inputs: [{name: "spender", type: "address"}, {name: "tokenId", type: "uint256"}],}, [_Staking, tokenId]);
    return await  dapp.sendTransaction(_NTF, 0, data);
}

function zhiya() {
    const tokenId = document.querySelector("#my-nft").value;
    const data = web3.eth.abi.encodeFunctionCall({name: 'zhiya', type: 'function', inputs: [{name: "tokenId", type: "uint256"}],}, [tokenId]);
    dapp.calls(() => approveNFT(tokenId), () => dapp.sendTransaction(_Staking, 0, data)).then(function (result) {
        console.log(result);
    });
}

function shuhui() {
    const tokenId = document.querySelector("#staking-nft").value;
    const data = web3.eth.abi.encodeFunctionCall({name:'shuhui', type: 'function', inputs: [{name: "tokenId", type: "uint256"}],}, [tokenId]);
    dapp.sendTransaction(_Staking, 0, data);
}

function take(isQuery){
    const data = web3.eth.abi.encodeFunctionCall({name: 'take', type: 'function',}, []);
    console.log(data);
    if (isQuery) {
        dapp.ethCall(_Staking, data).then(function (result) {
            const values = web3.eth.abi.decodeParameters([{type: 'uint256', name: 'value'},], result);
            console.log("可领取奖励:" + values.value);
        });
    } else {
        dapp.sendTransaction(_Staking, 0, data).then(function (result) {

        });
    }
}