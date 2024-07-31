class DAppError extends Error {

    static CODE_SWITCH_ETHEREUM_CHAIN = 0
    static CODE_GAS_PRICE = 1
    static CODE_ESTIMATE_GAS = 2
    static CODE_SEND_TRANSACTION = 3
    static CODE_CHECK_TRANSACTION = 4
    static CODE_CALL_TRANSACTION = 5
    static CODE_REQUEST_ACCOUNTS = 6
    static CODE_REQUEST_CALL = 7
    static CODE_PERSONAL_SIGN = 8

    constructor(code, message) {
        super('DApp Error! code: ' + code + ' message: ' + message);
        this.code = code;
    }
}

const dapp = {
    ethereum() {
        if (typeof window.ethereum == 'undefined' || !window.ethereum) {
            throw Error('请在dapp中访问');
        }
        return window.ethereum;
    },

    web3() {
        if (window.dappWeb3 === undefined) {
            window.dappWeb3 = new Web3(this.ethereum());
            console.log("init web3");
        }
        return window.dappWeb3;
    },

    async sendTransaction(to, value, data) {
        const from = await this.requestAccounts();
        const web3 = this.web3();
        let tx = {from: from, to: to, data: data};
        if (this.isNumeric(value) && !this.isDecimal(value) && web3.utils.toBigInt(value) > 0) {
            tx.value = web3.utils.toHex(web3.utils.toBigInt(value));
        }
        console.log("send transaction params: ", tx);
        let gasPrice;
        try {
            gasPrice = await this.ethereum().request({method: 'eth_gasPrice', params: []})
        } catch (e) {
            console.log("get gas price err:", e);
            throw new DAppError(DAppError.CODE_GAS_PRICE, 'request gas price error');
        }
        console.log("gas price:", gasPrice);
        let estimateGas;
        try {
            estimateGas = await this.ethereum().request({method: 'eth_estimateGas', params: [tx]});
        } catch (e) {
            console.log("get gas err:", e);
            throw new DAppError(DAppError.CODE_ESTIMATE_GAS, 'request estimate gas error');
        }
        console.log("estimate gas:", estimateGas);
        tx.gasPrice = gasPrice;
        tx.gas = estimateGas;
        try {
            return await this.ethereum().request({method: 'eth_sendTransaction', params: [tx]})
        } catch (e) {
            console.log("send transaction err:", e);
            throw new DAppError(DAppError.CODE_SEND_TRANSACTION, 'request send transaction err');
        }
    },

    loopCheck(hash, resolve, reject) {
        if (typeof hash == 'string' && hash.length > 60 && hash.startsWith("0x")) {
            let checkNum = 1;
            let isRequested = false;
            const interval = setInterval(() => {
                if (isRequested) return;
                isRequested = true;
                this.ethereum().request({method: 'eth_getTransactionByHash', params: [hash]}).then((result) => {
                    const b = result != null && result.blockHash.length > 60;
                    console.log("check hash:", hash, "check num:", checkNum, "up:", b, "data:", result);
                    if (b) {
                        clearInterval(interval);
                        resolve(hash);
                    }
                    if (checkNum >= 30) {
                        clearInterval(interval);
                        reject(new DAppError(DAppError.CODE_CHECK_TRANSACTION, 'check transaction err'));
                    }
                    isRequested = false;
                }).catch((e) => {
                    console.log("check hash:", hash, "check num:", checkNum, "up:", false, "data:", null);
                    if (checkNum >= 30) {
                        clearInterval(interval);
                        reject(new DAppError(DAppError.CODE_CHECK_TRANSACTION, 'check transaction err'));
                    }
                    isRequested = false;
                })
                checkNum++;
            }, 2000);
        }
    },

    call(transaction) {
        console.log(transaction);
        const that = this;
        return new Promise((resolve, reject) => {
            if (typeof transaction != 'function') {
                reject(new DAppError(DAppError.CODE_CALL_TRANSACTION, 'call transaction param type: ' + (typeof transaction)));
                return;
            }
            const result = transaction();
            if (result instanceof Promise) {
                result.then((hash) => {
                    if (typeof hash == 'string' && hash.length > 60 && hash.startsWith("0x")) {
                        that.loopCheck(hash, resolve, reject);
                    } else {
                        resolve(hash);
                    }
                }).catch((err) => {
                    reject(err);
                });
            } else if (typeof result == 'string' && result.length > 60 && result.startsWith("0x")) {
                that.loopCheck(result, resolve, reject);
            } else {
                reject(new DAppError(DAppError.CODE_CALL_TRANSACTION, 'call transaction function result type: ' + (typeof result)));
            }
        });
    },

    async calls(...transactions) {
        let arr = [];
        for (let i = 0; i < transactions.length; i++) {
            const hash = await this.call(transactions[i]);
            arr.push(hash);
        }
        return arr;
    },

    /**
     * {
     *       "chainId": "56",
     *       "chainName": "BSC Smart Chain",
     *       "rpcUrls": [
     *         "https://rpc.ankr.com/bsc"
     *       ],
     *       "iconUrls": [
     *         "https://xdaichain.com/fake/example/url/xdai.svg",
     *         "https://xdaichain.com/fake/example/url/xdai.png"
     *       ],
     *       "nativeCurrency": {
     *         "name": "BNB",
     *         "symbol": "BNB",
     *         "decimals": 18
     *       },
     *       "blockExplorerUrls": [
     *         "https://bscscan.com/"
     *       ]
     *     }
     * @param chain
     */
    async addEthereumChain(chain) {
        try {
            return await this.ethereum().request({method: 'wallet_switchEthereumChain', params: [{chainId: web3.utils.numberToHex(chain.chainId)}],});
        } catch (switchError) {
            if (switchError.code === 4902 || switchError.code === -32603) {
                try {
                    chain.chainId = web3.utils.numberToHex(chain.chainId);
                    console.log(chain);
                    return await this.ethereum().request({method: 'wallet_addEthereumChain', params: [chain,],});
                } catch (addError) {
                    throw new DAppError(DAppError.CODE_SWITCH_ETHEREUM_CHAIN, 'switch chain error');
                }
            } else {
                throw new DAppError(DAppError.CODE_SWITCH_ETHEREUM_CHAIN, 'switch chain error');
            }
        }
    },

    async switchEthereumChain(chainId) {
        const web3 = this.web3();
        try {
            await this.ethereum().request({method: 'wallet_switchEthereumChain', params: [{chainId: web3.utils.numberToHex(chainId)}]});
        } catch (e) {
            console.log('wallet_switchEthereumChain: ', e);
            throw new DAppError(DAppError.CODE_SWITCH_ETHEREUM_CHAIN, 'switch chain error');
        }
    },

    async signMessage(originMessage, account) {
        try {
            return await this.ethereum().request({method: 'personal_sign', params: [originMessage, account]});
        } catch (e) {
            console.log('personal_sign: ', e);
            throw new DAppError(DAppError.CODE_PERSONAL_SIGN, 'sign message error');
        }
    },

    async requestAccounts() {
        try {
            return (await this.ethereum().request({method: 'eth_requestAccounts', params: []}))[0];
        } catch (e) {
            console.log('eth_requestAccounts: ', e);
            throw new DAppError(DAppError.CODE_REQUEST_ACCOUNTS, 'request account error');
        }
    },

    async requestCall(to, data) {
        try {
            const from = await this.requestAccounts();
            const call_data = {method: 'eth_call', params: [{from: from, to: to, data: data}, "latest"]}
            console.log("eth_call data:", call_data);
            return await this.ethereum().request(call_data);
        } catch (e) {
            console.log('eth_call: ', e);
            throw new DAppError(DAppError.CODE_REQUEST_CALL, "eth call error");
        }
    },

    async transfer(contract, to, value) {
        const web3 = this.web3();
        const data = web3.eth.abi.encodeFunctionCall({
            name: 'transfer',
            type: 'function',
            inputs: [{type: 'address', name: 'recipient'}, {type: 'uint256', name: 'amount'}]
        }, [to, value]);
        console.log("data:", data);
        return (await this.sendTransaction(contract, 0, data));
    },

    async allowance(contract, spender) {
        const web3 = this.web3();
        const owner = await this.requestAccounts();
        const data = web3.eth.abi.encodeFunctionCall({
            name: 'allowance',
            type: 'function',
            inputs: [{name: "owner", type: "address"}, {name: "spender", type: "address"}],
        }, [owner, spender]);
        const result = await this.requestCall(contract, data);
        const amount = web3.eth.abi.decodeParameters([{type: 'uint256', name: 'amount'},], result);
        console.log('allowance result:', web3.utils.toBigInt(amount.amount));
        return web3.utils.toBigInt(amount.amount);
    },

    async balanceOf(contract) {
        const web3 = this.web3();
        const owner = await this.requestAccounts();
        console.log("account:", owner);
        const data = web3.eth.abi.encodeFunctionCall({
            name: 'balanceOf',
            type: 'function',
            inputs: [{name: "account", type: "address"}],
        }, [owner]);
        const result = await this.requestCall(contract, data);
        const amount = web3.eth.abi.decodeParameters([{type: 'uint256', name: 'amount'},], result);
        console.log('balanceOf result:', web3.utils.toBigInt(amount.amount));
        return web3.utils.toBigInt(amount.amount);
    },

    async approve(contract, spender, value) {
        const web3 = this.web3();
        console.log("approve contract:", contract, "spender:", spender);
        const allowance = await this.allowance(contract, spender);
        if (value && web3.utils.toBigInt(value) > 0 && allowance > web3.utils.toBigInt(value)) return "skip";
        const maxUint256 = web3.utils.toBigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935");
        const data = web3.eth.abi.encodeFunctionCall({
            name: 'approve',
            type: 'function',
            inputs: [{name: "spender", type: "address"}, {name: "amount", type: "uint256"}],
        }, [spender, maxUint256]);
        return (await this.sendTransaction(contract, 0, data));
    },

    toWei(value) {
        return this.web3().utils.toWei(value.toString(), 'ether');
    },

    fromWei(value) {
        return this.web3().utils.fromWei(value, 'ether');
    },

    isNumeric(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    },

    isDecimal(num) {
        return /\./.test(num.toString());
    },

    isInt(n) {
        return this.isNumeric(n) && !this.isDecimal(n);
    }
}