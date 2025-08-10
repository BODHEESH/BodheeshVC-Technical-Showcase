/**
 * AWS Infrastructure Setup and Management
 * Demonstrating EC2, S3, Route 53, IAM services
 * Author: Bodheesh VC
 */

const AWS = require('aws-sdk');

// Configure AWS SDK
AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

class AWSInfrastructureManager {
    constructor() {
        this.ec2 = new AWS.EC2();
        this.s3 = new AWS.S3();
        this.route53 = new AWS.Route53();
        this.iam = new AWS.IAM();
        this.cloudformation = new AWS.CloudFormation();
    }

    // 1. EC2 Instance Management
    async createEC2Instance(instanceConfig) {
        try {
            const params = {
                ImageId: instanceConfig.imageId || 'ami-0c02fb55956c7d316',
                InstanceType: instanceConfig.instanceType || 't3.micro',
                MinCount: 1,
                MaxCount: 1,
                KeyName: instanceConfig.keyName,
                SecurityGroupIds: instanceConfig.securityGroups || [],
                UserData: Buffer.from(instanceConfig.userData || '').toString('base64'),
                TagSpecifications: [{
                    ResourceType: 'instance',
                    Tags: [
                        { Key: 'Name', Value: instanceConfig.name || 'Portfolio-Server' },
                        { Key: 'Environment', Value: instanceConfig.environment || 'dev' },
                        { Key: 'Owner', Value: 'Bodheesh VC' }
                    ]
                }]
            };

            const result = await this.ec2.runInstances(params).promise();
            console.log(`🚀 EC2 Instance created: ${result.Instances[0].InstanceId}`);
            return result.Instances[0];
        } catch (error) {
            console.error('❌ Failed to create EC2 instance:', error);
            throw error;
        }
    }

    // 2. S3 Bucket Operations
    async createS3Bucket(bucketName) {
        try {
            await this.s3.createBucket({ Bucket: bucketName }).promise();
            console.log(`🪣 S3 Bucket created: ${bucketName}`);

            // Configure for static website
            await this.s3.putBucketWebsite({
                Bucket: bucketName,
                WebsiteConfiguration: {
                    IndexDocument: { Suffix: 'index.html' },
                    ErrorDocument: { Key: 'error.html' }
                }
            }).promise();

            return bucketName;
        } catch (error) {
            console.error('❌ Failed to create S3 bucket:', error);
            throw error;
        }
    }

    // 3. IAM Management
    async createIAMUser(username, policies = []) {
        try {
            await this.iam.createUser({ UserName: username }).promise();
            console.log(`👤 IAM User created: ${username}`);

            for (const policyArn of policies) {
                await this.iam.attachUserPolicy({
                    UserName: username,
                    PolicyArn: policyArn
                }).promise();
            }

            return username;
        } catch (error) {
            console.error('❌ Failed to create IAM user:', error);
            throw error;
        }
    }

    // 4. Route 53 DNS
    async createDNSRecord(hostedZoneId, recordName, value) {
        try {
            const params = {
                HostedZoneId: hostedZoneId,
                ChangeBatch: {
                    Changes: [{
                        Action: 'CREATE',
                        ResourceRecordSet: {
                            Name: recordName,
                            Type: 'A',
                            TTL: 300,
                            ResourceRecords: [{ Value: value }]
                        }
                    }]
                }
            };

            const result = await this.route53.changeResourceRecordSets(params).promise();
            console.log(`🌐 DNS record created: ${recordName}`);
            return result;
        } catch (error) {
            console.error('❌ Failed to create DNS record:', error);
            throw error;
        }
    }
}

module.exports = { AWSInfrastructureManager };
