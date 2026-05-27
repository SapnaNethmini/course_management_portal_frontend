.PHONY: stop start

stop:
	docker-compose stop course-frontend
start:
	git pull origin main
	docker start nysc-grafana
	docker system prune -af
	docker stop nysc-grafana
	docker-compose up -d course-frontend
	docker ps
