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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uaXRvcmluZy1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1vbml0b3Jpbmctc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLHlEQUF5RDtBQUl6RCxtREFBbUQ7QUFXbkQsTUFBYSxlQUFnQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQzVDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBMkI7UUFDbkUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsMEJBQTBCO1FBQzFCLE1BQU0sU0FBUyxHQUFHLElBQUksVUFBVSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUscUJBQXFCLEVBQUU7WUFDdEUsYUFBYSxFQUFFLHVCQUF1QixLQUFLLENBQUMsS0FBSyxFQUFFO1NBQ3BELENBQUMsQ0FBQztRQUVILHlCQUF5QjtRQUN6QixNQUFNLGVBQWUsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQztZQUN0RCxTQUFTLEVBQUUsS0FBSztZQUNoQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUNILE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUM7WUFDM0QsU0FBUyxFQUFFLEtBQUs7WUFDaEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCxhQUFhO1FBQ2IsTUFBTSxpQkFBaUIsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyx3Q0FBd0MsQ0FBQztZQUNqRixTQUFTLEVBQUUsU0FBUztZQUNwQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILGNBQWM7UUFDZCxTQUFTLENBQUMsVUFBVSxDQUNsQixJQUFJLFVBQVUsQ0FBQyxXQUFXLENBQUM7WUFDekIsS0FBSyxFQUFFLHNDQUFzQztZQUM3QyxJQUFJLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQztZQUMzQixLQUFLLEVBQUUsQ0FBQyxlQUFlLENBQUM7WUFDeEIsS0FBSyxFQUFFLEVBQUU7U0FDVixDQUFDLEVBQ0YsSUFBSSxVQUFVLENBQUMsV0FBVyxDQUFDO1lBQ3pCLEtBQUssRUFBRSwyQ0FBMkM7WUFDbEQsSUFBSSxFQUFFLENBQUMsaUJBQWlCLENBQUM7WUFDekIsS0FBSyxFQUFFLEVBQUU7U0FDVixDQUFDLENBQ0gsQ0FBQztRQUVGLFlBQVk7UUFDWiwrQkFBK0I7UUFDL0IsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSwwQkFBMEIsRUFBRTtZQUNyRCxTQUFTLEVBQUUsNkJBQTZCLEtBQUssQ0FBQyxLQUFLLEVBQUU7WUFDckQsTUFBTSxFQUFFLGVBQWU7WUFDdkIsU0FBUyxFQUFFLENBQUM7WUFDWixpQkFBaUIsRUFBRSxDQUFDO1lBQ3BCLGtCQUFrQixFQUFFLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxrQ0FBa0M7WUFDcEYsZ0JBQWdCLEVBQUUsaURBQWlEO1NBQ3BFLENBQUMsQ0FBQztRQUVILG9CQUFvQjtRQUNwQixJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQzdDLFNBQVMsRUFBRSx3QkFBd0IsS0FBSyxDQUFDLEtBQUssRUFBRTtZQUNoRCxNQUFNLEVBQUUsaUJBQWlCO1lBQ3pCLFNBQVMsRUFBRSxDQUFDO1lBQ1osaUJBQWlCLEVBQUUsQ0FBQztZQUNwQixrQkFBa0IsRUFBRSxVQUFVLENBQUMsa0JBQWtCLENBQUMsa0NBQWtDO1lBQ3BGLGdCQUFnQixFQUFFLG9EQUFvRDtTQUN2RSxDQUFDLENBQUM7UUFFSCwrREFBK0Q7UUFDL0QsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUM5QyxNQUFNLEVBQUU7Z0JBQ04sVUFBVSxFQUFFLHNCQUFzQixLQUFLLENBQUMsS0FBSyxFQUFFO2dCQUMvQyxVQUFVLEVBQUUsTUFBTTtnQkFDbEIsUUFBUSxFQUFFLFNBQVM7Z0JBQ25CLFdBQVcsRUFBRTtvQkFDWCxNQUFNLEVBQUUsRUFBRTtvQkFDVixJQUFJLEVBQUUsS0FBSztpQkFDWjthQUNGO1lBQ0QsNEJBQTRCLEVBQUU7Z0JBQzVCO29CQUNFLFlBQVksRUFBRTt3QkFDWixrQkFBa0IsRUFBRSxjQUFjO3dCQUNsQyxnQkFBZ0IsRUFBRSxRQUFRO3dCQUMxQixTQUFTLEVBQUUsRUFBRSxFQUFFLHFCQUFxQjt3QkFDcEMsYUFBYSxFQUFFLFlBQVk7cUJBQzVCO29CQUNELFdBQVcsRUFBRTt3QkFDWDs0QkFDRSxnQkFBZ0IsRUFBRSxPQUFPOzRCQUN6QixPQUFPLEVBQUUsc0JBQXNCO3lCQUNoQztxQkFDRjtpQkFDRjthQUNGO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBMUZELDBDQTBGQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBjbG91ZHdhdGNoIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZHdhdGNoJztcbmltcG9ydCAqIGFzIGFwaWd3djIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mic7XG5pbXBvcnQgKiBhcyBzZm4gZnJvbSAnYXdzLWNkay1saWIvYXdzLXN0ZXBmdW5jdGlvbnMnO1xuaW1wb3J0ICogYXMgc3FzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zcXMnO1xuaW1wb3J0ICogYXMgYnVkZ2V0cyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYnVkZ2V0cyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGludGVyZmFjZSBNb25pdG9yaW5nU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgc3RhZ2U6IHN0cmluZztcbiAgYXBpOiBhcGlnd3YyLkh0dHBBcGk7XG4gIHN0YXRlTWFjaGluZTogc2ZuLlN0YXRlTWFjaGluZTtcbiAgc2NhblF1ZXVlOiBzcXMuUXVldWU7XG4gIGRscTogc3FzLkRlYWRMZXR0ZXJRdWV1ZTtcbn1cblxuZXhwb3J0IGNsYXNzIE1vbml0b3JpbmdTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBNb25pdG9yaW5nU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLy8gMS4gQ2xvdWRXYXRjaCBEYXNoYm9hcmRcbiAgICBjb25zdCBkYXNoYm9hcmQgPSBuZXcgY2xvdWR3YXRjaC5EYXNoYm9hcmQodGhpcywgJ09wZXJhdGlvbnNEYXNoYm9hcmQnLCB7XG4gICAgICBkYXNoYm9hcmROYW1lOiBgVmliZVNpZnQtT3BlcmF0aW9ucy0ke3Byb3BzLnN0YWdlfWAsXG4gICAgfSk7XG5cbiAgICAvLyBTdGVwIEZ1bmN0aW9ucyBtZXRyaWNzXG4gICAgY29uc3Qgc2ZuRmFpbGVkTWV0cmljID0gcHJvcHMuc3RhdGVNYWNoaW5lLm1ldHJpY0ZhaWxlZCh7XG4gICAgICBzdGF0aXN0aWM6ICdTdW0nLFxuICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICB9KTtcbiAgICBjb25zdCBzZm5FeGVjdXRpb25zTWV0cmljID0gcHJvcHMuc3RhdGVNYWNoaW5lLm1ldHJpY1N0YXJ0ZWQoe1xuICAgICAgc3RhdGlzdGljOiAnU3VtJyxcbiAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXG4gICAgfSk7XG5cbiAgICAvLyBETFEgTWV0cmljXG4gICAgY29uc3QgZGxxTWVzc2FnZXNNZXRyaWMgPSBwcm9wcy5kbHEucXVldWUubWV0cmljQXBwcm94aW1hdGVOdW1iZXJPZk1lc3NhZ2VzVmlzaWJsZSh7XG4gICAgICBzdGF0aXN0aWM6ICdNYXhpbXVtJyxcbiAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXG4gICAgfSk7XG5cbiAgICAvLyBBZGQgd2lkZ2V0c1xuICAgIGRhc2hib2FyZC5hZGRXaWRnZXRzKFxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xuICAgICAgICB0aXRsZTogJ0F1ZGl0IFdvcmtmbG93IEV4ZWN1dGlvbnMgJiBGYWlsdXJlcycsXG4gICAgICAgIGxlZnQ6IFtzZm5FeGVjdXRpb25zTWV0cmljXSxcbiAgICAgICAgcmlnaHQ6IFtzZm5GYWlsZWRNZXRyaWNdLFxuICAgICAgICB3aWR0aDogMTIsXG4gICAgICB9KSxcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcbiAgICAgICAgdGl0bGU6ICdEZWFkLUxldHRlciBRdWV1ZSBNZXNzYWdlcyAoRmFpbGVkIFNjYW5zKScsXG4gICAgICAgIGxlZnQ6IFtkbHFNZXNzYWdlc01ldHJpY10sXG4gICAgICAgIHdpZHRoOiAxMixcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIC8vIDIuIEFsYXJtc1xuICAgIC8vIFN0ZXAgRnVuY3Rpb25zIEZhaWx1cmUgQWxhcm1cbiAgICBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnU3RlcEZ1bmN0aW9uRmFpbHVyZUFsYXJtJywge1xuICAgICAgYWxhcm1OYW1lOiBgVmliZVNpZnQtV29ya2Zsb3dGYWlsdXJlcy0ke3Byb3BzLnN0YWdlfWAsXG4gICAgICBtZXRyaWM6IHNmbkZhaWxlZE1ldHJpYyxcbiAgICAgIHRocmVzaG9sZDogMSxcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAxLFxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fT1JfRVFVQUxfVE9fVEhSRVNIT0xELFxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0FsZXJ0cyBpZiBhbnkgc2NhbiB3b3JrZmxvdyBmYWlscyB1bnJlY292ZXJhYmx5JyxcbiAgICB9KTtcblxuICAgIC8vIERMUSBNZXNzYWdlIEFsYXJtXG4gICAgbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ0RMUU1lc3NhZ2VzQWxhcm0nLCB7XG4gICAgICBhbGFybU5hbWU6IGBWaWJlU2lmdC1ETFFNZXNzYWdlcy0ke3Byb3BzLnN0YWdlfWAsXG4gICAgICBtZXRyaWM6IGRscU1lc3NhZ2VzTWV0cmljLFxuICAgICAgdGhyZXNob2xkOiAxLFxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDEsXG4gICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9PUl9FUVVBTF9UT19USFJFU0hPTEQsXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnQWxlcnRzIHdoZW4gbWVzc2FnZXMgbGFuZCBpbiB0aGUgRGVhZC1MZXR0ZXIgUXVldWUnLFxuICAgIH0pO1xuXG4gICAgLy8gMy4gQVdTIEJ1ZGdldCBDb3N0IEFsYXJtICgkMjAgVVNEIGxpbWl0IGZvciBkZXYgZW52aXJvbm1lbnQpXG4gICAgbmV3IGJ1ZGdldHMuQ2ZuQnVkZ2V0KHRoaXMsICdEZXZNb250aGx5QnVkZ2V0Jywge1xuICAgICAgYnVkZ2V0OiB7XG4gICAgICAgIGJ1ZGdldE5hbWU6IGBWaWJlU2lmdC1EZXZCdWRnZXQtJHtwcm9wcy5zdGFnZX1gLFxuICAgICAgICBidWRnZXRUeXBlOiAnQ09TVCcsXG4gICAgICAgIHRpbWVVbml0OiAnTU9OVEhMWScsXG4gICAgICAgIGJ1ZGdldExpbWl0OiB7XG4gICAgICAgICAgYW1vdW50OiAyNSxcbiAgICAgICAgICB1bml0OiAnVVNEJyxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBub3RpZmljYXRpb25zV2l0aFN1YnNjcmliZXJzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBub3RpZmljYXRpb246IHtcbiAgICAgICAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogJ0dSRUFURVJfVEhBTicsXG4gICAgICAgICAgICBub3RpZmljYXRpb25UeXBlOiAnQUNUVUFMJyxcbiAgICAgICAgICAgIHRocmVzaG9sZDogODAsIC8vIEFsZXJ0IGF0IDgwJSAoJDIwKVxuICAgICAgICAgICAgdGhyZXNob2xkVHlwZTogJ1BFUkNFTlRBR0UnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgc3Vic2NyaWJlcnM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgc3Vic2NyaXB0aW9uVHlwZTogJ0VNQUlMJyxcbiAgICAgICAgICAgICAgYWRkcmVzczogJ2FkbWluQHZpYmVzaWZ0LmxvY2FsJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==