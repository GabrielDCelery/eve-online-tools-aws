aws ecr get-login-password --region eu-west-2 | docker login --username AWS --password-stdin 395174503847.dkr.ecr.eu-west-2.amazonaws.com
docker build -t eve-services .
docker tag eve-services:latest 395174503847.dkr.ecr.eu-west-2.amazonaws.com/eve-services:latest
docker push 395174503847.dkr.ecr.eu-west-2.amazonaws.com/eve-services:latest