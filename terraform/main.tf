terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
      version = "6.26.0"
    }
    random = {
      source = "hashicorp/random"
      version = "3.7.2"
    }
  }
}

provider "aws" {
  region = var.region
}

# # Provision EC2 Instances
# resource "aws_instance" "app_server" {
#   for_each = { for inst in local.ec2_instances : inst.key => inst }

#   ami           = "ami-02b8269d5e85954ef" 
#   instance_type = "t2.micro"

#   tags = {
#     Name = each.value.name
#   }
# }

# # Provision S3 Buckets
# resource "aws_s3_bucket" "storage" {
#   for_each = { for bucket in local.s3_buckets : bucket.key => bucket }

#   # Professional Tip: Prefix with account ID or project name to avoid global collision
#   bucket = lower("${each.value.name}-${random_string.suffix[each.key].result}")
  
#   tags = {
#     ManagedBy = "UI-Orchestrator"
#   }
# }

# # Helper to ensure unique bucket names
# resource "random_string" "suffix" {
#   for_each = { for bucket in local.s3_buckets : bucket.key => bucket }
#   length   = 6
#   special  = false
#   upper    = false
# }