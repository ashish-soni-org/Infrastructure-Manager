terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.40.0" # Pinned to a stable recent version
    }
    random = {
      source  = "hashicorp/random"
      version = "3.6.0"
    }
  }

  backend "s3" {
    # Backend configuration is injected via partial configuration (-backend-config)
    # during the CI/CD pipeline execution (terraform init).
  }
}

provider "aws" {
  region = var.aws_region
}