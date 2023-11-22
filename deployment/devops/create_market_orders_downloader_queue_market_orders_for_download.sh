#! /bin/bash
cd ../../services/market-orders-downloader
aws ecr get-login-password --region eu-west-2 | docker login --username AWS --password-stdin 395174503847.dkr.ecr.eu-west-2.amazonaws.com
docker build . -f ./docker/Dockerfile.queue_market_orders_for_download -t eve-market-orders-downloader/queue-market-orders-for-download
docker tag eve-market-orders-downloader/queue-market-orders-for-download:latest 395174503847.dkr.ecr.eu-west-2.amazonaws.com/eve-market-orders-downloader/queue-market-orders-for-download:latest
docker push 395174503847.dkr.ecr.eu-west-2.amazonaws.com/eve-market-orders-downloader/queue-market-orders-for-download:latest