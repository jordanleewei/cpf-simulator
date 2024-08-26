#!/bin/bash

# Define the ECS cluster and services
CLUSTER_NAME="simulatorCluster"
SERVICES=(
    "cpf_simulator_backend_v1"
    "service-admin"
    "service-csa"
)

# Function to update the ECS service with the latest task definition
update_service() {
    local service_name=$1

    # Get the latest task definition for the service
    task_definition_arn=$(aws ecs describe-services \
        --cluster $CLUSTER_NAME \
        --services $service_name \
        --query "services[0].taskDefinition" \
        --output text)

    if [ -z "$task_definition_arn" ]; then
        echo "Failed to retrieve task definition for service $service_name"
        return 1
    fi

    # Force update the service with the latest task definition
    echo "Updating service $service_name with task definition $task_definition_arn..."
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service $service_name \
        --task-definition $task_definition_arn \
        --force-new-deployment

    if [ $? -eq 0 ]; then
        echo "Service $service_name updated successfully."
    else
        echo "Failed to update service $service_name."
    fi
}

# Iterate over all services and update them
for service in "${SERVICES[@]}"; do
    update_service $service
done

echo "All services have been updated with the latest task definitions."
