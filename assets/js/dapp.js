const dapp = {
    ethereum() {
        if (typeof window.ethereum == 'undefined' || !window.ethereum) {
            const e = new Error('Please open it in the dapp environment');
            e.code = -1;
            throw e;
        }
        return window.ethereum;
    },

    web3() {
        if (window.dappWeb3 === undefined) {
            window.dappWeb3 = new Web3(this.ethereum());
        }
        return window.dappWeb3;
    },

    __loop_check(hash, resolve, reject) {
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
                        const e = new Error('Check Transaction Error: Timeout 30s');
                        e.code = -1;
                        reject(e);
                    }
                    isRequested = false;
                }).catch((e) => {
                    console.log("check hash:", hash, "check num:", checkNum, "up:", false, "data:", null);
                    if (checkNum >= 30) {
                        clearInterval(interval);
                        const e = new Error('Check Transaction Error: Timeout 30s');
                        e.code = -1;
                        reject(e);
                    }
                    isRequested = false;
                })
                checkNum++;
            }, 2000);
        }
    },

    call(transaction) {
        const that = this;
        return new Promise((resolve, reject) => {
            if (typeof transaction != 'function') {
                const e = new Error('Call Transaction Param Type Not Support');
                e.code = -1;
                reject(e);
                return;
            }
            const result = transaction();
            if (result instanceof Promise) {
                result.then((hash) => {
                    if (typeof hash == 'string' && hash.length > 60 && hash.startsWith("0x")) {
                        that.__loop_check(hash, resolve, reject);
                    } else {
                        resolve(hash);
                    }
                }).catch((err) => {
                    reject(err);
                });
            } else if (typeof result == 'string' && result.length > 60 && result.startsWith("0x")) {
                that.__loop_check(result, resolve, reject);
            } else {
                const e = new Error('Call Transaction Error');
                e.code = -1;
                reject(e);
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
                    throw addError;
                }
            } else {
                throw switchError;
            }
        }
    },

    async switchEthereumChain(chainId) {
        await this.ethereum().request({method: 'wallet_switchEthereumChain', params: [{chainId: web3.utils.numberToHex(chainId)}]});
    },

    async signMessage(originMessage, account) {
        return await this.ethereum().request({method: 'personal_sign', params: [originMessage, account]});
    },

    async requestAccounts() {
        return (await this.ethereum().request({method: 'eth_requestAccounts', params: []}))[0];
    },

    async sendTransaction(to, value, data) {
        const from = await this.requestAccounts();
        const web3 = this.web3();
        const tx = {from: from, to: to, data: data};
        if (this.isNumeric(value) && !this.isDecimal(value) && web3.utils.toBigInt(value) > 0) {
            tx.value = web3.utils.toHex(web3.utils.toBigInt(value));
        }
        console.log("Send Transaction Params: ", tx);
        const gasPrice = await this.ethereum().request({method: 'eth_gasPrice', params: []})
        console.log("Gas Price:", gasPrice);
        const estimateGas = await this.ethereum().request({method: 'eth_estimateGas', params: [tx]});
        console.log("Estimate Gas:", estimateGas);
        tx.gasPrice = gasPrice;
        tx.gas = estimateGas;
        return await this.ethereum().request({method: 'eth_sendTransaction', params: [tx]})
    },

    async ethCall(to, data) {
        const from = await this.requestAccounts();
        const call_data = {method: 'eth_call', params: [{from: from, to: to, data: data}, "latest"]}
        console.log("Call Data:", call_data);
        return await this.ethereum().request(call_data);
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
        const result = await this.ethCall(contract, data);
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
        const result = await this.ethCall(contract, data);
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

    //https://github.com/MetaMask/rpc-errors/blob/main/src/error-constants.ts
    getError(e){
        console.error("look error: ", e);
        const err = new Error();
        err.code = e.code;
        err.message = e.message;
        switch (e.code) {
            case -32603:
                const data = e.data;
                err.code = data.code;
                switch (data.code) {
                    case 3:
                        err.message = data.message;
                        break;
                }
                break
            case 4001:
                break
        }
        return err;
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
    },

    getQueryString(name) {
        let reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
        let r = window.location.search.substring(1).match(reg);
        if (r != null) {
            return decodeURIComponent(r[2]);
        }
        return null;
    },
}