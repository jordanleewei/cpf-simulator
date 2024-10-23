#!/bin/bash

# Define variables for AWS ECR repository and image names
AWS_ACCOUNT_ID="471112806622"
REGION="ap-southeast-1"
ECR_URL="$AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

# AWS ECR login
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_URL

# Array of services and corresponding image names
services=(
    "backend:cpf_simulator_backend_connected_to_aws_rdb"
    "final-csa-dashboard:cpf_simulator_trainee_frontend"
    "admin-dashboard:cpf_simulator_frontend"
    "trainer-dashboard:cpf_simulator_trainer_frontend"
)

# Function to build, tag, and push Docker images using docker-compose
build_and_push() {
    local service_name=$1
    local image_name=$2
    
    echo "Building Docker image for $service_name..."

    # Build the Docker image using docker-compose
    docker compose build $service_name

    # Tag the Docker image
    docker tag $image_name:latest $ECR_URL/$image_name:latest

    # Push the Docker image to AWS ECR
    docker push $ECR_URL/$image_name:latest

    echo "Docker image for $service_name pushed successfully."
}

# Navigate to the directory containing the docker-compose.yml file
cd "$(dirname "$0")" || exit

# Iterate over all services and run the build_and_push function
for service in "${services[@]}"; do
    # Split the string into service name and image name
    service_name=$(echo $service | cut -d':' -f1)
    image_name=$(echo $service | cut -d':' -f2)
    
    # Run the build_and_push function
    build_and_push $service_name $image_name
done

echo "All Docker images have been built and pushed successfully."
