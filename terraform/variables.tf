variable "region" {
  description = "default-value-of-region"
  type = string
  default = "ap-south-1"
}

variable "instance_type" {
  description = "type-of-instance"
  type = string
  default = "t3.micro"
  
}

variable "server_name" {
  description = "name-of-the-server"
  type = string
  default = "Production Server"
  
}

variable "subnet_availability_zone" {
  description = "subnet_availability_zone"
  type = string
  default = "ap-south-1b"
  
}

variable "ami" {
  description = "ami-id"
  type = string
  default = "ami-02b8269d5e85954ef"
  
}

variable "connection_type" {
  description = ""
  type = string
  default = "aws_ssm"
  
}

variable "ui_manifest" {
  type        = any
  description = "Infrastructure manifest from the UI"
}