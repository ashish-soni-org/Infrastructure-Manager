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

# Provision EC2 Instances
resource "aws_instance" "app_server" {
  for_each = { for inst in local.ec2_instances : inst.key => inst }

  ami           = "ami-0c55b159cbfafe1f0" 
  instance_type = "t2.micro"

  tags = {
    Name = each.value.name
  }
}

# Provision S3 Buckets
resource "aws_s3_bucket" "storage" {
  for_each = { for bucket in local.s3_buckets : bucket.key => bucket }

  bucket = lower(each.value.name) # S3 requires lowercase names
  
  tags = {
    ManagedBy = "UI-Orchestrator"
  }
}