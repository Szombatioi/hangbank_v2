start_auth(){
    docker run -d \
        --name hangbank-auth \    
        -e POSTGRES_USER=auth_admin \
        -e POSTGRES_PASSWORD=auth_admin \
        -e POSTGRES_DB=auth_db \          
        -p 5434:5432 \
        postgres:latest
}

start_backend(){
    docker run -d \
        --name hangbank-postgres \
        -e POSTGRES_USER=hangbank \
        -e POSTGRES_PASSWORD=hangbank \
        -e POSTGRES_DB=hangbank_dev \
        -p 5433:5432 \
        postgres:latest
}
