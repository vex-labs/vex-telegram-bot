import { connect, keyStores, KeyPair, providers } from 'near-api-js';
import * as dotenv from 'dotenv';
import { KeyPairString } from 'near-api-js/lib/utils';

dotenv.config();

const RELAYER_ACCOUNT_ID = 'relay.betvex.testnet';
const CONTRACT_ACCOUNT_ID = 'proxy-bet-1.testnet'; 
const GAS = "300000000000000";

type TransactionInput = {
    subscriber_public_key: string;
    nonce: string;
    block_hash: string;
};

type BetInput = {
    match_id: string;
    team: string;
    amount: string;
};

export async function callProxyBet(
    subscriberAccountId: string,
    publicKey: string,
    matchId: string,
    team: string,
    amount: string
): Promise<any> {
    const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY;
    if (!relayerPrivateKey) {
        throw new Error("RELAYER_PRIVATE_KEY not found in environment variables");
    }

    try {
        // Set up the key store and connection
        const myKeyStore = new keyStores.InMemoryKeyStore();
        const keyPair = KeyPair.fromString(relayerPrivateKey as KeyPairString);
        await myKeyStore.setKey("testnet", RELAYER_ACCOUNT_ID, keyPair);

        const connectionConfig = {
            networkId: "testnet",
            keyStore: myKeyStore,
            nodeUrl: "https://test.rpc.fastnear.com",
        };

        // Connect to NEAR
        const near = await connect(connectionConfig);
        const relayerAccount = await near.account(RELAYER_ACCOUNT_ID);

        // Get the nonce of the key
        const accessKey = await near.connection.provider.query({
            request_type: 'view_access_key',
            account_id: subscriberAccountId,
            public_key: publicKey,
            finality: 'optimistic'
        });
        const nonce = (accessKey as any).nonce;

        // Get recent block hash
        const block = await near.connection.provider.block({
            finality: "final",
        });
        const blockHash = block.header.hash;

        // Prepare transaction input
        const transaction_input: TransactionInput = {
            subscriber_public_key: publicKey,
            nonce: (nonce + 1).toString(),
            block_hash: blockHash,
        };

        // Prepare bet input
        const bet_input: BetInput = {
            match_id: matchId,
            team: team,
            amount: amount,
        };

        // Call the contract to proxy the bet
        const outcome = await relayerAccount.functionCall({
            contractId: CONTRACT_ACCOUNT_ID,
            methodName: "proxy_bet",
            args: {
                account_id: subscriberAccountId,
                transaction_input,
                bet_input,
            },
            gas: BigInt(GAS),
            attachedDeposit: BigInt(1),
        });

        for (const receipt of outcome.receipts_outcome) {
            if (!receipt.outcome.status || !(receipt.outcome.status.hasOwnProperty("SuccessValue") || receipt.outcome.status.hasOwnProperty("SuccessReceiptId"))) {
                console.error("Transaction failed: One or more receipts did not succeed in MPC call");
                throw new Error("Transaction failed: One or more receipts did not succeed");
            }
        }

        // Get the signed transaction from the outcome
        const result = providers.getTransactionLastResult(outcome);
        const signedTx = new Uint8Array(result as ArrayBuffer);

        // Send the signed transaction
        const send_result = await (near.connection.provider as any).sendJsonRpc("broadcast_tx_commit", [
            Buffer.from(signedTx).toString("base64"),
        ]);

        for (const receipt of send_result.receipts_outcome) {
            if (!receipt.outcome.status || !(receipt.outcome.status.hasOwnProperty("SuccessValue") || receipt.outcome.status.hasOwnProperty("SuccessReceiptId"))) {
                console.error("Transaction failed: One or more receipts did not succeed in bet call");
                throw new Error("Transaction failed: One or more receipts did not succeed");
            }
        }

        return send_result;

    } catch (error) {
        console.error('Error in callProxyBet:', error);
        throw error;
    }
} 