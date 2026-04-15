FROM python:3.12-slim-bullseye

WORKDIR /calculator

COPY requirements.txt .

RUN apt-get update && \
    apt-get install -y --no-install-recommends netcat-openbsd && \
    rm -rf /var/lib/apt/lists/* && \
    pip install --upgrade pip && \
    pip install -r requirements.txt


COPY entrypoint.sh .

RUN chmod +x /calculator/entrypoint.sh

COPY . .

ENTRYPOINT ["/calculator/entrypoint.sh"]