services:
  tms_service:
    build: .
    volumes:
      # Mount host docker socket into the container
      - /var/run/docker.sock:/var/run/docker.sock
    # On Linux, the container user needs permission to access docker.sock:
    # user: "1000:999" (where 999 is the docker group GID) or run as root for dev
    user: root
    environment:
      - DOCKER_SOCKET_PATH=/var/run/docker.sock