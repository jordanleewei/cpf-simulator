#!/bin/bash

# List of your CloudFront distribution IDs
DISTRIBUTION_IDS=(
    "EG6JTHH4ANKKH"  # Replace with your actual Distribution ID for admin.ccutrainingsimulator.com
    "EZQFXY5KSY9N5"  # Replace with your actual Distribution ID for backendapi.ccutrainingsimulator.com
    "E18NPGVQ3G7IKX"  # Replace with your actual Distribution ID for csa.ccutrainingsimulator.com
    "E3F16K3J2EKJBS"  # Replace with your actual Distribution ID for trainer.ccutrainingsimulator.com
)

# Function to create an invalidation
create_invalidation() {
    local distribution_id=$1
    local timestamp=$(date +%s)
    local invalidation_id=$(aws cloudfront create-invalidation --distribution-id $distribution_id --paths "/*" --query 'Invalidation.Id' --output text)
    
    if [ $? -eq 0 ]; then
        echo "Invalidation created successfully for distribution $distribution_id with ID $invalidation_id."
    else
        echo "Failed to create invalidation for distribution $distribution_id."
    fi
}

# Loop over each distribution ID and create an invalidation
for distribution_id in "${DISTRIBUTION_IDS[@]}"; do
    create_invalidation $distribution_id
done
