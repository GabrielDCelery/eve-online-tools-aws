#! /bin/bash
cd ../../services/market-orders-downloader
aws ecr get-login-password --region eu-west-2 | docker login --username AWS --password-stdin 395174503847.dkr.ecr.eu-west-2.amazonaws.com
docker build . -f ./docker/Dockerfile.download_queued_market_orders -t eve-market-orders-downloader/download-queued-market-orders
docker tag eve-market-orders-downloader/download-queued-market-orders:latest 395174503847.dkr.ecr.eu-west-2.amazonaws.com/eve-market-orders-downloader/download-queued-market-orders:latest
docker push 395174503847.dkr.ecr.eu-west-2.amazonaws.com/eve-market-orders-downloader/download-queued-market-orders:latest