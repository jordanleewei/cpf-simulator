#!/bin/bash

# Function to update Route 53 record for a given service
update_record() {
    local CLUSTER_NAME="simulatorCluster"
    local SERVICE_NAME=$1
    local RECORD_NAME=$2
    local ZONE_ID="Z06606971C4WYDP941XP2"

    # Get the task ARN
    TASK_ARN=$(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name $SERVICE_NAME --query "taskArns[0]" --output text)

    # Check if TASK_ARN is empty
    if [ -z "$TASK_ARN" ]; then
        echo "No running tasks found for the service: $SERVICE_NAME"
        return
    fi

    # Get the ENI (Elastic Network Interface) ID
    ENI_ID=$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $TASK_ARN --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" --output text)

    # Check if ENI_ID is empty
    if [ -z "$ENI_ID" ]; then
        echo "No ENI found for the task: $TASK_ARN"
        return
    fi

    # Get the public IP address associated with the ENI
    PUBLIC_IP=$(aws ec2 describe-network-interfaces --network-interface-ids $ENI_ID --query "NetworkInterfaces[0].Association.PublicIp" --output text)

    # Check if PUBLIC_IP is empty
    if [ -z "$PUBLIC_IP" ]; then
        echo "No public IP found for the ENI: $ENI_ID"
        return
    fi

    # Update the Route 53 record with the new IP address
    aws route53 change-resource-record-sets --hosted-zone-id $ZONE_ID --change-batch '{
      "Changes": [
        {
          "Action": "UPSERT",
          "ResourceRecordSet": {
            "Name": "'"$RECORD_NAME"'",
            "Type": "A",
            "TTL": 60,
            "ResourceRecords": [
              {
                "Value": "'"$PUBLIC_IP"'"
              }
            ]
          }
        }
      ]
    }'

    echo "Route 53 record $RECORD_NAME updated to IP $PUBLIC_IP"
}

# Update the Route 53 records for all services
update_record "service-admin" "admin-ip.ccutrainingsimulator.com"
update_record "service-csa" "csa-ip.ccutrainingsimulator.com"
update_record "cpf_simulator_backend_v1" "backendapi-ip.ccutrainingsimulator.com"
