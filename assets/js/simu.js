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
const USDT = "0x04D768834C5D1711984b599559961f59b4E3835a";
const SIMU = "0x04D768834C5D1711984b599559961f59b4E3835a";
const web3 = dapp.web3();
console.log("init simu");

function getQueryString(name) {
    let reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
    let r = window.location.search.substring(1).match(reg);
    if (r != null) {
        return decodeURIComponent(r[2]);
    }
    return null;
}

let referrer = getQueryString("referrer");

function connect() {
    const btn = document.getElementById("top-action-button");
    dapp.requestAccounts().then(function (account) {
        dapp.addEthereumChain(CHAIN_BSC_TEST).then(function () {
            document.getElementById("btn-connect").innerText = account;
        }).catch(function (e) {
            console.log("addEthereumChain error:", e)
            btn.onclick = function () {
                connect();
            }
        })
    }).catch(function (e) {
        console.log("requestAccounts error:", e)
        btn.onclick = function () {
            connect();
        }
    })
}

window.onload = function () {
    console.log("simu window onload");
    connect();
}

web3.provider.on('accountsChanged', (accounts) => {
})

async function buy(amount) {
    const value = dapp.toWei(amount);
    data = web3.eth.abi.encodeFunctionCall({
        name: 'subscribe',
        type: 'function',
        inputs: [{name: "value", type: "uint256"}],
    }, [amount]);
    data = await dapp.calls(() => dapp.approve(USDT, SIMU, value), () => dapp.sendTransaction(SIMU, 0, data))
    console.log(data);
}

async function buy0() {
    const value = document.getElementsByName("number")[0].value;
    if (!dapp.isNumeric(value)) {
        alert("数量输入不正确");
    }
    let data = web3.eth.abi.encodeFunctionCall({
        name: 'subscribe',
        type: 'function',
        inputs: [{name: "value", type: "uint256"}],
    }, [dapp.toWei(value)]);
    data = await dapp.calls(() => dapp.approve(USDT, SIMU, dapp.toWei(value)), () => dapp.sendTransaction(SIMU, 0, data))
    console.log(data);
}
