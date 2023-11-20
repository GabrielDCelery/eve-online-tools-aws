import { ReceiveMessageCommand, SQSClient, DeleteMessageBatchCommand, SendMessageCommand, MessageAttributeValue } from '@aws-sdk/client-sqs';

export type SQSRequest = {
    sqsMessageID: string;
    sqsReceiptHandle: string;
    payload: unknown;
};

type CustomSQSRequest<T> = SQSRequest & { payload: T };

export class SQSMessageRetriever<T> {
    private sqsClient: SQSClient;
    private sqsQueueUrl: string;

    constructor({ region, sqsQueueUrl }: { region: string; sqsQueueUrl: string }) {
        this.sqsClient = new SQSClient({ region });
        this.sqsQueueUrl = sqsQueueUrl;
    }

    getNextBatchOfRequestsFromQueue = async (): Promise<CustomSQSRequest<T>[]> => {
        const command = new ReceiveMessageCommand({
            QueueUrl: this.sqsQueueUrl,
            MaxNumberOfMessages: 5,
            WaitTimeSeconds: 30,
        });

        const result = await this.sqsClient.send(command);

        const messages = result.Messages || [];

        const transformedMessages = messages.map((Message) => {
            const sqsReceiptHandle = (() => {
                if (!Message.ReceiptHandle) {
                    throw new Error(`Missing receipt handle`);
                }
                return Message.ReceiptHandle;
            })();

            const sqsMessageID = (() => {
                if (!Message.MessageId) {
                    throw new Error(`Missing message ID`);
                }
                return Message.MessageId;
            })();

            const payload = JSON.parse(Message.Body || '{}') as T;

            return {
                sqsMessageID: sqsMessageID,
                sqsReceiptHandle: sqsReceiptHandle,
                payload: payload,
            };
        });

        return transformedMessages;
    };

    removeRequestsFromQueue = async <T>({ sqsRequests }: { sqsRequests: CustomSQSRequest<T>[] }) => {
        const command = new DeleteMessageBatchCommand({
            QueueUrl: this.sqsQueueUrl,
            Entries: sqsRequests.map((sqsRequest) => ({
                Id: sqsRequest.sqsMessageID,
                ReceiptHandle: sqsRequest.sqsReceiptHandle,
            })),
        });

        await this.sqsClient.send(command);
    };

    sendMessageToQueue = async ({ message }: { message: { MessageBody: string; MessageAttributes?: Record<string, MessageAttributeValue> } }) => {
        const command = new SendMessageCommand({
            QueueUrl: this.sqsQueueUrl,
            DelaySeconds: 0,
            MessageBody: message.MessageBody,
            ...(message.MessageAttributes ? { MessageAtributes: message.MessageAttributes } : {}),
        });

        await this.sqsClient.send(command);
    };
}
