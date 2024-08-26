#!/bin/bash

# Define variables for AWS ECR repository and image names
AWS_ACCOUNT_ID="471112806622"
REGION="ap-southeast-1"
ECR_URL="$AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

# Array of project directories and corresponding image names
projects=(
    "backend:cpf_simulator_backend_connected_to_aws_rdb"
    "final-csa-dashboard:cpf_simulator_trainee_frontend"
    "admin-dashboard:cpf_simulator_frontend"
)

# Function to build, tag, and push Docker images
build_and_push() {
    local project_dir=$1
    local image_name=$2
    
    echo "Building Docker image for $project_dir..."

    # Check if the project directory exists
    if [ -d "$project_dir" ]; then
        # Navigate to the project directory
        cd "$project_dir" || exit

        # Build the Docker image
        docker build -t $image_name .

        # Tag the Docker image
        docker tag $image_name:latest $ECR_URL/$image_name:latest

        # Push the Docker image to AWS ECR
        docker push $ECR_URL/$image_name:latest

        echo "Docker image for $project_dir pushed successfully."

        # Return to the original directory
        cd - > /dev/null
    else
        echo "Directory $project_dir does not exist. Skipping..."
    fi
}

# Iterate over all projects and run the build_and_push function in parallel
for project in "${projects[@]}"; do
    # Split the string into directory and image name
    project_dir=$(echo $project | cut -d':' -f1)
    image_name=$(echo $project | cut -d':' -f2)
    
    # Run the build_and_push function in the background
    build_and_push $project_dir $image_name &
done

# Wait for all background jobs to complete
wait

echo "All Docker images have been built and pushed successfully."
