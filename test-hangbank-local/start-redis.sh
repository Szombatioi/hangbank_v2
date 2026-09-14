docker run -d \
--name redis-server \
--network hangbank_test \
-p 6379:6379 \
redis:alpine