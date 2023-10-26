CORE_V4_IP=$(cat ./config.json | jq -r ".HEALTH_CHECK.CORE_V4_IP")

# # known_hosts remembers servers we've ssh'd into in the past.
# # ssh can use this file to verify the legitimacy of CORE_V4_IP.
# # So, we know for sure that we're setting up a connection to Core-v4
DOCKER_CONTAINER_KNOWN_HOSTS=~/.ssh/known_hosts

# # This is Quasar's private ssh key. It's needed in order to connect
# # to Core-v4. Without this, ssh cannot decrypt data coming from
# # Core-v4
DOCKER_CONTAINER_SSH_KEYS=~/.ssh/id_rsa

# # This is the port on Core-v4 that will be forwarded into the conn
# # container (try curl localhost:CORE_V4_PORT in Core-v4). Software responisble
# # to check health checks, on Core-v4 will communicate with the container
# # through Core-v4's localhost:CORE_V4_PORT

CORE_V4_PORT=18000

QUASAR_PORT=8000

CORE_V4_HOST=sce@${CORE_V4_IP}


num_args=$#
arg=$1

check_valid_arg_amount() {
  if [ "$((num_args))" -ne 1 ];
  then
    echo "Error: expected 1 argument only."
    echo "usage: ./tunnel.sh [start]/[stop]"
    exit 1
  fi
}

choose_startup() {
  check_valid_arg_amount
  if [[ ${arg} == "start" ]]; then
    echo -e "\e[0;33m🔥Starting tunnel🔥\e[0m"
    start_ssh_tunnel
    echo -e "\e[0;33m🔥Starting api🔥\e[0m"
    start_api
  elif [[ ${arg} == "stop" ]]; then
    echo -e "\e[0;33m☹️Stopping tunnel☹️\e[0m"
    stop_ssh_tunnel
    echo -e "\e[0;33m🤨Stopping api😲\e[0m"
    stop_api
  else
    echo -e "\e[0;31mNot a valid command\e[0m"
    exit 1
  fi
}

# # Start the tunnel!
start_ssh_tunnel () {
    # (more info about the switches can be found in "man ssh")
    # -o is for option to give known_hosts
    # -i is for giving Quasar's private key
    # -f -N makes ssh run in the background. We don't need a shell because
    #   we are just creating a tunnel.
    # -R is to port forward. This is actually what creates the tunnel!
    #   This forwards packets created in Core-v4 and sent into its
    #   localhost:CORE_V4_PORT to Quasar's localhost:QUASAR_PORT and vise-versa.
    #   Consequently, this creates the tunnel from Core-v4:CORE_V4_PORT to
    #   Quasar:QUASAR_PORT
    # Lastly, CORE_V4_HOST is given to signify the user and ip of Core-v4.

    ssh -v \
    -o UserKnownHostsFile=${DOCKER_CONTAINER_KNOWN_HOSTS} \
    -o StrictHostKeyChecking=no \
    -i ${DOCKER_CONTAINER_SSH_KEYS} \
    -f -g -N -R 0.0.0.0:${CORE_V4_PORT}:localhost:${QUASAR_PORT} ${CORE_V4_HOST} >/dev/null 2>&1
    if [[ $? -eq 0 ]]
    then
      echo -e "\e[0;34mListening on port\e[0m" "\e[0;35m${QUASAR_PORT} 🥶\e[0m"
    else
      echo -e "\e[0;31m☹️Error\e[0m"
    fi

}

stop_ssh_tunnel () {
  kill -QUIT $(pgrep -f localhost)
}

start_api() {
  node ./api.js &
}

stop_api() {
  kill -9 $(pgrep -f ./api.js)
}

choose_startup