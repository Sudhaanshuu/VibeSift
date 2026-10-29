import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import { Construct } from 'constructs';

export interface MonitoringStackProps extends cdk.StackProps {
  stage: string;
  api: apigwv2.HttpApi;
  stateMachine: sfn.StateMachine;
  scanQueue: sqs.Queue;
  dlq: sqs.DeadLetterQueue;
}

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
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
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Audit Workflow Executions & Failures',
        left: [sfnExecutionsMetric],
        right: [sfnFailedMetric],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Dead-Letter Queue Messages (Failed Scans)',
        left: [dlqMessagesMetric],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'API Gateway HTTP Traffic & Error Rates (4xx / 5xx)',
        left: [api4xxMetric],
        right: [api5xxMetric],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Security: Rate Limit Hits & Bot Shield Blocks',
        left: [rateLimitBlockedMetric, botChallengeFailuresMetric],
        width: 12,
      })
    );

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
