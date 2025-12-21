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

variable "ui_manifest" {
  description = "The infrastructure manifest sent from the UI Orchestrator"
  type        = any 
}

# Example of how to use it in main.tf
locals {
  # Flatten the manifest to get all EC2 instances across all VPCs/Subnets
  all_ec2_instances = flatten([
    for vpc in var.ui_manifest : [
      for subnet in vpc.subnets : [
        for res in subnet.resources : res.instances if res.type == "EC2"
      ]
    ]
  ])
}

resource "aws_instance" "orchestrated_vm" {
  for_each = { for idx, inst in local.all_ec2_instances : idx => inst }
  
  ami           = "ami-0c55b159cbfafe1f0" # Ubuntu 22.04
  instance_type = "t2.micro"
  
  tags = {
    Name = each.value.name
  }
}