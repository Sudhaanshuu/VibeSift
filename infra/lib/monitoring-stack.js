"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoringStack = void 0;
const cdk = require("aws-cdk-lib");
const cloudwatch = require("aws-cdk-lib/aws-cloudwatch");
const budgets = require("aws-cdk-lib/aws-budgets");
class MonitoringStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // 1. CloudWatch Dashboard
        const dashboard = new cloudwatch.Dashboard(this, 'OperationsDashboard', {
            dashboardName: `VibeSift-Operations-${props.stage}`,
        });
        // Step Functions metrics
        const sfnFailedMetric = props.stateMachine.metricFailed({
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
        });
        const sfnExecutionsMetric = props.stateMachine.metricStarted({
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
        });
        // DLQ Metric
        const dlqMessagesMetric = props.dlq.queue.metricApproximateNumberOfMessagesVisible({
            statistic: 'Maximum',
            period: cdk.Duration.minutes(5),
        });
        // API Gateway & Security Rate Limit Metrics
        const api4xxMetric = new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: '4xx',
            dimensionsMap: { ApiId: props.api.apiId },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
        });
        const api5xxMetric = new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: '5xx',
            dimensionsMap: { ApiId: props.api.apiId },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
        });
        const rateLimitBlockedMetric = new cloudwatch.Metric({
            namespace: 'VibeSift/Audits',
            metricName: 'RateLimitBlockedRequests',
            dimensionsMap: { Environment: props.stage },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
        });
        const botChallengeFailuresMetric = new cloudwatch.Metric({
            namespace: 'VibeSift/Audits',
            metricName: 'BotChallengeFailures',
            dimensionsMap: { Environment: props.stage },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
        });
        // Add widgets
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'Audit Workflow Executions & Failures',
            left: [sfnExecutionsMetric],
            right: [sfnFailedMetric],
            width: 12,
        }), new cloudwatch.GraphWidget({
            title: 'Dead-Letter Queue Messages (Failed Scans)',
            left: [dlqMessagesMetric],
            width: 12,
        }), new cloudwatch.GraphWidget({
            title: 'API Gateway HTTP Traffic & Error Rates (4xx / 5xx)',
            left: [api4xxMetric],
            right: [api5xxMetric],
            width: 12,
        }), new cloudwatch.GraphWidget({
            title: 'Security: Rate Limit Hits & Bot Shield Blocks',
            left: [rateLimitBlockedMetric, botChallengeFailuresMetric],
            width: 12,
        }));
        // 2. Alarms
        // Step Functions Failure Alarm
        new cloudwatch.Alarm(this, 'StepFunctionFailureAlarm', {
            alarmName: `VibeSift-WorkflowFailures-${props.stage}`,
            metric: sfnFailedMetric,
            threshold: 1,
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            alarmDescription: 'Alerts if any scan workflow fails unrecoverably',
        });
        // DLQ Message Alarm
        new cloudwatch.Alarm(this, 'DLQMessagesAlarm', {
            alarmName: `VibeSift-DLQMessages-${props.stage}`,
            metric: dlqMessagesMetric,
            threshold: 1,
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            alarmDescription: 'Alerts when messages land in the Dead-Letter Queue',
        });
        // 3. AWS Budget Cost Alarm ($20 USD limit for dev environment)
        new budgets.CfnBudget(this, 'DevMonthlyBudget', {
            budget: {
                budgetName: `VibeSift-DevBudget-${props.stage}`,
                budgetType: 'COST',
                timeUnit: 'MONTHLY',
                budgetLimit: {
                    amount: 25,
                    unit: 'USD',
                },
            },
            notificationsWithSubscribers: [
                {
                    notification: {
                        comparisonOperator: 'GREATER_THAN',
                        notificationType: 'ACTUAL',
                        threshold: 80, // Alert at 80% ($20)
                        thresholdType: 'PERCENTAGE',
                    },
                    subscribers: [
                        {
                            subscriptionType: 'EMAIL',
                            address: 'admin@vibesift.local',
                        },
                    ],
                },
            ],
        });
    }
}
exports.MonitoringStack = MonitoringStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uaXRvcmluZy1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1vbml0b3Jpbmctc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLHlEQUF5RDtBQUl6RCxtREFBbUQ7QUFXbkQsTUFBYSxlQUFnQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQzVDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBMkI7UUFDbkUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsMEJBQTBCO1FBQzFCLE1BQU0sU0FBUyxHQUFHLElBQUksVUFBVSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUscUJBQXFCLEVBQUU7WUFDdEUsYUFBYSxFQUFFLHVCQUF1QixLQUFLLENBQUMsS0FBSyxFQUFFO1NBQ3BELENBQUMsQ0FBQztRQUVILHlCQUF5QjtRQUN6QixNQUFNLGVBQWUsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQztZQUN0RCxTQUFTLEVBQUUsS0FBSztZQUNoQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUNILE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUM7WUFDM0QsU0FBUyxFQUFFLEtBQUs7WUFDaEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCxhQUFhO1FBQ2IsTUFBTSxpQkFBaUIsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyx3Q0FBd0MsQ0FBQztZQUNqRixTQUFTLEVBQUUsU0FBUztZQUNwQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILDRDQUE0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Q3BFLENBQUMsQ0FBQztRQUVILG9CQUFvQjtRQUNwQixJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQzdDLFNBQVMsRUFBRSx3QkFBd0IsS0FBSyxDQUFDLEtBQUssRUFBRTtZQUNoRCxNQUFNLEVBQUUsaUJBQWlCO1lBQ3pCLFNBQVMsRUFBRSxDQUFDO1lBQ1osaUJBQWlCLEVBQUUsQ0FBQztZQUNwQixrQkFBa0IsRUFBRSxVQUFVLENBQUMsa0JBQWtCLENBQUMsa0NBQWtDO1lBQ3BGLGdCQUFnQixFQUFFLG9EQUFvRDtTQUN2RSxDQUFDLENBQUM7UUFFSCwrREFBK0Q7UUFDL0QsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUM5QyxNQUFNLEVBQUU7Z0JBQ04sVUFBVSxFQUFFLHNCQUFzQixLQUFLLENBQUMsS0FBSyxFQUFFO2dCQUMvQyxVQUFVLEVBQUUsTUFBTTtnQkFDbEIsUUFBUSxFQUFFLFNBQVM7Z0JBQ25CLFdBQVcsRUFBRTtvQkFDWCxNQUFNLEVBQUUsRUFBRTtvQkFDVixJQUFJLEVBQUUsS0FBSztpQkFDWjthQUNGO1lBQ0QsNEJBQTRCLEVBQUU7Z0JBQzVCO29CQUNFLFlBQVksRUFBRTt3QkFDWixrQkFBa0IsRUFBRSxjQUFjO3dCQUNsQyxnQkFBZ0IsRUFBRSxRQUFRO3dCQUMxQixTQUFTLEVBQUUsRUFBRSxFQUFFLHFCQUFxQjt3QkFDcEMsYUFBYSxFQUFFLFlBQVk7cUJBQzVCO29CQUNELFdBQVcsRUFBRTt3QkFDWDs0QkFDRSxnQkFBZ0IsRUFBRSxPQUFPOzRCQUN6QixPQUFPLEVBQUUsc0JBQXNCO3lCQUNoQztxQkFDRjtpQkFDRjthQUNGO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBbklELDBDQW1JQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBjbG91ZHdhdGNoIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZHdhdGNoJztcbmltcG9ydCAqIGFzIGFwaWd3djIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mic7XG5pbXBvcnQgKiBhcyBzZm4gZnJvbSAnYXdzLWNkay1saWIvYXdzLXN0ZXBmdW5jdGlvbnMnO1xuaW1wb3J0ICogYXMgc3FzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zcXMnO1xuaW1wb3J0ICogYXMgYnVkZ2V0cyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYnVkZ2V0cyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGludGVyZmFjZSBNb25pdG9yaW5nU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgc3RhZ2U6IHN0cmluZztcbiAgYXBpOiBhcGlnd3YyLkh0dHBBcGk7XG4gIHN0YXRlTWFjaGluZTogc2ZuLlN0YXRlTWFjaGluZTtcbiAgc2NhblF1ZXVlOiBzcXMuUXVldWU7XG4gIGRscTogc3FzLkRlYWRMZXR0ZXJRdWV1ZTtcbn1cblxuZXhwb3J0IGNsYXNzIE1vbml0b3JpbmdTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBNb25pdG9yaW5nU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLy8gMS4gQ2xvdWRXYXRjaCBEYXNoYm9hcmRcbiAgICBjb25zdCBkYXNoYm9hcmQgPSBuZXcgY2xvdWR3YXRjaC5EYXNoYm9hcmQodGhpcywgJ09wZXJhdGlvbnNEYXNoYm9hcmQnLCB7XG4gICAgICBkYXNoYm9hcmROYW1lOiBgVmliZVNpZnQtT3BlcmF0aW9ucy0ke3Byb3BzLnN0YWdlfWAsXG4gICAgfSk7XG5cbiAgICAvLyBTdGVwIEZ1bmN0aW9ucyBtZXRyaWNzXG4gICAgY29uc3Qgc2ZuRmFpbGVkTWV0cmljID0gcHJvcHMuc3RhdGVNYWNoaW5lLm1ldHJpY0ZhaWxlZCh7XG4gICAgICBzdGF0aXN0aWM6ICdTdW0nLFxuICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICB9KTtcbiAgICBjb25zdCBzZm5FeGVjdXRpb25zTWV0cmljID0gcHJvcHMuc3RhdGVNYWNoaW5lLm1ldHJpY1N0YXJ0ZWQoe1xuICAgICAgc3RhdGlzdGljOiAnU3VtJyxcbiAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXG4gICAgfSk7XG5cbiAgICAvLyBETFEgTWV0cmljXG4gICAgY29uc3QgZGxxTWVzc2FnZXNNZXRyaWMgPSBwcm9wcy5kbHEucXVldWUubWV0cmljQXBwcm94aW1hdGVOdW1iZXJPZk1lc3NhZ2VzVmlzaWJsZSh7XG4gICAgICBzdGF0aXN0aWM6ICdNYXhpbXVtJyxcbiAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXG4gICAgfSk7XG5cbiAgICAvLyBBUEkgR2F0ZXdheSAmIFNlY3VyaXR5IFJhdGUgTGltaXQgTWV0cmljc1xuICAgIGNvbnN0IGFwaTR4eE1ldHJpYyA9IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XG4gICAgICBuYW1lc3BhY2U6ICdBV1MvQXBpR2F0ZXdheScsXG4gICAgICBtZXRyaWNOYW1lOiAnNHh4JyxcbiAgICAgIGRpbWVuc2lvbnNNYXA6IHsgQXBpSWQ6IHByb3BzLmFwaS5hcGlJZCB9LFxuICAgICAgc3RhdGlzdGljOiAnU3VtJyxcbiAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXG4gICAgfSk7XG4gICAgY29uc3QgYXBpNXh4TWV0cmljID0gbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcbiAgICAgIG5hbWVzcGFjZTogJ0FXUy9BcGlHYXRld2F5JyxcbiAgICAgIG1ldHJpY05hbWU6ICc1eHgnLFxuICAgICAgZGltZW5zaW9uc01hcDogeyBBcGlJZDogcHJvcHMuYXBpLmFwaUlkIH0sXG4gICAgICBzdGF0aXN0aWM6ICdTdW0nLFxuICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICB9KTtcbiAgICBjb25zdCByYXRlTGltaXRCbG9ja2VkTWV0cmljID0gbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcbiAgICAgIG5hbWVzcGFjZTogJ1ZpYmVTaWZ0L0F1ZGl0cycsXG4gICAgICBtZXRyaWNOYW1lOiAnUmF0ZUxpbWl0QmxvY2tlZFJlcXVlc3RzJyxcbiAgICAgIGRpbWVuc2lvbnNNYXA6IHsgRW52aXJvbm1lbnQ6IHByb3BzLnN0YWdlIH0sXG4gICAgICBzdGF0aXN0aWM6ICdTdW0nLFxuICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICB9KTtcbiAgICBjb25zdCBib3RDaGFsbGVuZ2VGYWlsdXJlc01ldHJpYyA9IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XG4gICAgICBuYW1lc3BhY2U6ICdWaWJlU2lmdC9BdWRpdHMnLFxuICAgICAgbWV0cmljTmFtZTogJ0JvdENoYWxsZW5nZUZhaWx1cmVzJyxcbiAgICAgIGRpbWVuc2lvbnNNYXA6IHsgRW52aXJvbm1lbnQ6IHByb3BzLnN0YWdlIH0sXG4gICAgICBzdGF0aXN0aWM6ICdTdW0nLFxuICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICB9KTtcblxuICAgIC8vIEFkZCB3aWRnZXRzXG4gICAgZGFzaGJvYXJkLmFkZFdpZGdldHMoXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XG4gICAgICAgIHRpdGxlOiAnQXVkaXQgV29ya2Zsb3cgRXhlY3V0aW9ucyAmIEZhaWx1cmVzJyxcbiAgICAgICAgbGVmdDogW3NmbkV4ZWN1dGlvbnNNZXRyaWNdLFxuICAgICAgICByaWdodDogW3NmbkZhaWxlZE1ldHJpY10sXG4gICAgICAgIHdpZHRoOiAxMixcbiAgICAgIH0pLFxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xuICAgICAgICB0aXRsZTogJ0RlYWQtTGV0dGVyIFF1ZXVlIE1lc3NhZ2VzIChGYWlsZWQgU2NhbnMpJyxcbiAgICAgICAgbGVmdDogW2RscU1lc3NhZ2VzTWV0cmljXSxcbiAgICAgICAgd2lkdGg6IDEyLFxuICAgICAgfSksXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XG4gICAgICAgIHRpdGxlOiAnQVBJIEdhdGV3YXkgSFRUUCBUcmFmZmljICYgRXJyb3IgUmF0ZXMgKDR4eCAvIDV4eCknLFxuICAgICAgICBsZWZ0OiBbYXBpNHh4TWV0cmljXSxcbiAgICAgICAgcmlnaHQ6IFthcGk1eHhNZXRyaWNdLFxuICAgICAgICB3aWR0aDogMTIsXG4gICAgICB9KSxcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcbiAgICAgICAgdGl0bGU6ICdTZWN1cml0eTogUmF0ZSBMaW1pdCBIaXRzICYgQm90IFNoaWVsZCBCbG9ja3MnLFxuICAgICAgICBsZWZ0OiBbcmF0ZUxpbWl0QmxvY2tlZE1ldHJpYywgYm90Q2hhbGxlbmdlRmFpbHVyZXNNZXRyaWNdLFxuICAgICAgICB3aWR0aDogMTIsXG4gICAgICB9KVxuICAgICk7XG5cbiAgICAvLyAyLiBBbGFybXNcbiAgICAvLyBTdGVwIEZ1bmN0aW9ucyBGYWlsdXJlIEFsYXJtXG4gICAgbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ1N0ZXBGdW5jdGlvbkZhaWx1cmVBbGFybScsIHtcbiAgICAgIGFsYXJtTmFtZTogYFZpYmVTaWZ0LVdvcmtmbG93RmFpbHVyZXMtJHtwcm9wcy5zdGFnZX1gLFxuICAgICAgbWV0cmljOiBzZm5GYWlsZWRNZXRyaWMsXG4gICAgICB0aHJlc2hvbGQ6IDEsXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMSxcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX09SX0VRVUFMX1RPX1RIUkVTSE9MRCxcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdBbGVydHMgaWYgYW55IHNjYW4gd29ya2Zsb3cgZmFpbHMgdW5yZWNvdmVyYWJseScsXG4gICAgfSk7XG5cbiAgICAvLyBETFEgTWVzc2FnZSBBbGFybVxuICAgIG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdETFFNZXNzYWdlc0FsYXJtJywge1xuICAgICAgYWxhcm1OYW1lOiBgVmliZVNpZnQtRExRTWVzc2FnZXMtJHtwcm9wcy5zdGFnZX1gLFxuICAgICAgbWV0cmljOiBkbHFNZXNzYWdlc01ldHJpYyxcbiAgICAgIHRocmVzaG9sZDogMSxcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAxLFxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fT1JfRVFVQUxfVE9fVEhSRVNIT0xELFxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0FsZXJ0cyB3aGVuIG1lc3NhZ2VzIGxhbmQgaW4gdGhlIERlYWQtTGV0dGVyIFF1ZXVlJyxcbiAgICB9KTtcblxuICAgIC8vIDMuIEFXUyBCdWRnZXQgQ29zdCBBbGFybSAoJDIwIFVTRCBsaW1pdCBmb3IgZGV2IGVudmlyb25tZW50KVxuICAgIG5ldyBidWRnZXRzLkNmbkJ1ZGdldCh0aGlzLCAnRGV2TW9udGhseUJ1ZGdldCcsIHtcbiAgICAgIGJ1ZGdldDoge1xuICAgICAgICBidWRnZXROYW1lOiBgVmliZVNpZnQtRGV2QnVkZ2V0LSR7cHJvcHMuc3RhZ2V9YCxcbiAgICAgICAgYnVkZ2V0VHlwZTogJ0NPU1QnLFxuICAgICAgICB0aW1lVW5pdDogJ01PTlRITFknLFxuICAgICAgICBidWRnZXRMaW1pdDoge1xuICAgICAgICAgIGFtb3VudDogMjUsXG4gICAgICAgICAgdW5pdDogJ1VTRCcsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgbm90aWZpY2F0aW9uc1dpdGhTdWJzY3JpYmVyczogW1xuICAgICAgICB7XG4gICAgICAgICAgbm90aWZpY2F0aW9uOiB7XG4gICAgICAgICAgICBjb21wYXJpc29uT3BlcmF0b3I6ICdHUkVBVEVSX1RIQU4nLFxuICAgICAgICAgICAgbm90aWZpY2F0aW9uVHlwZTogJ0FDVFVBTCcsXG4gICAgICAgICAgICB0aHJlc2hvbGQ6IDgwLCAvLyBBbGVydCBhdCA4MCUgKCQyMClcbiAgICAgICAgICAgIHRocmVzaG9sZFR5cGU6ICdQRVJDRU5UQUdFJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHN1YnNjcmliZXJzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHN1YnNjcmlwdGlvblR5cGU6ICdFTUFJTCcsXG4gICAgICAgICAgICAgIGFkZHJlc3M6ICdhZG1pbkB2aWJlc2lmdC5sb2NhbCcsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0pO1xuICB9XG59XG4iXX0=