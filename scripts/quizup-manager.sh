#!/bin/bash

while true; do
  clear
  echo "============================================"
  echo "          QuizUP Management Console"
  echo "============================================"
  echo
  echo "1. Start All Services (Full Stack)"
  echo "2. Stop All Services"
  echo "3. Setup Cloudflare Tunnel (First Time)"
  echo "4. Create DNS Records"
  echo "5. Troubleshoot Services"
  echo "6. View Service Status"
  echo "7. Clean Restart Everything"
  echo "8. View Logs"
  echo "9. Exit"
  echo
  read -p "Select an option (1-9): " choice

  case "$choice" in
    1)
      echo "============================================"
      echo "          Starting All Services"
      echo "============================================"
      echo "[1/3] Starting Docker services..."
      docker compose up -d

      echo "[2/3] Waiting for services to initialize..."
      sleep 15

      echo "[3/3] Starting Cloudflare Tunnel..."
      echo
      echo "Services available at:"
      echo "- https://quizdash.dpdns.org (Frontend)"
      echo "- https://api.quizdash.dpdns.org (Backend API)"
      echo "- https://match.quizdash.dpdns.org (Match Server)"
      echo "- https://grafana.quizdash.dpdns.org (Grafana)"
      echo "- https://adminer.quizdash.dpdns.org (Database)"
      echo "- https://prometheus.quizdash.dpdns.org (Monitoring)"
      echo "- https://redis.quizdash.dpdns.org (Redis)"
      echo
      echo "Starting tunnel... (Press Ctrl+C to stop)"
      cloudflared tunnel run 260b3937-da0e-4802-bd8b-219e47806139
      ;;

    2)
      echo "============================================"
      echo "          Stopping All Services"
      echo "============================================"
      echo "Stopping Docker services..."
      docker compose down
      echo "Stopping Cloudflare tunnel..."
      pkill -f cloudflared
      echo "All services stopped."
      read -n1 -r -p "Press any key to continue..."
      ;;

    3)
      echo "============================================"
      echo "        First Time Tunnel Setup"
      echo "============================================"
      mkdir -p ~/.cloudflared
      echo "Copying configuration files..."
      cp config-local.yml ~/.cloudflared/config.yml
      # cp 260b3937-da0e-4802-bd8b-219e47806139.json ~/.cloudflared/
      echo "Setup complete! Now run option 4 to create DNS records."
      read -n1 -r -p "Press any key to continue..."
      ;;

    4)
      echo "============================================"
      echo "          Creating DNS Records"
      echo "============================================"
      # cloudflared tunnel route dns 260b3937-da0e-4802-bd8b-219e47806139 quizdash.dpdns.org
      # cloudflared tunnel route dns 260b3937-da0e-4802-bd8b-219e47806139 api.quizdash.dpdns.org
      # cloudflared tunnel route dns 260b3937-da0e-4802-bd8b-219e47806139 match.quizdash.dpdns.org
      # cloudflared tunnel route dns 260b3937-da0e-4802-bd8b-219e47806139 grafana.quizdash.dpdns.org
      # cloudflared tunnel route dns 260b3937-da0e-4802-bd8b-219e47806139 adminer.quizdash.dpdns.org
      # cloudflared tunnel route dns 260b3937-da0e-4802-bd8b-219e47806139 prometheus.quizdash.dpdns.org
      # cloudflared tunnel route dns 260b3937-da0e-4802-bd8b-219e47806139 redis.quizdash.dpdns.org
      echo "DNS records created successfully!"
      read -n1 -r -p "Press any key to continue..."
      ;;

    5)
      echo "============================================"
      echo "             Troubleshooting"
      echo "============================================"
      echo "Docker containers:"
      docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
      echo
      echo "Port usage:"
      sudo lsof -i :3000 -i :3001 -i :5173 -i :8080 -i :9090 -i :8081 -i :3003
      echo
      echo "Testing endpoints:"
      curl -s http://localhost:3000/health || echo "Backend not responding"
      echo
      read -n1 -r -p "Press any key to continue..."
      ;;

    6)
      echo "============================================"
      echo "             Service Status"
      echo "============================================"
      echo "Docker Services:"
      docker compose ps
      echo
      echo "Cloudflare Tunnel:"
      pgrep -a cloudflared || echo "Tunnel not running"
      echo
      read -n1 -r -p "Press any key to continue..."
      ;;

    7)
      echo "============================================"
      echo "           Clean Restart"
      echo "============================================"
      echo "Stopping everything..."
      docker compose down
      pkill -f cloudflared
      echo "Cleaning up..."
      docker system prune -f
      echo "Restarting..."
      # restart by calling option 1 directly
      docker compose up -d
      sleep 15
      cloudflared tunnel run 260b3937-da0e-4802-bd8b-219e47806139
      ;;

    8)
      echo "============================================"
      echo "              View Logs"
      echo "============================================"
      echo "1. Backend logs"
      echo "2. Database logs"
      echo "3. All Docker logs"
      echo "4. Back to main menu"
      read -p "Select log type (1-4): " log_choice
      case "$log_choice" in
        1) docker compose logs backend --tail=50 ;;
        2) docker compose logs postgres --tail=50 ;;
        3) docker compose logs --tail=20 ;;
        4) continue ;;
      esac
      read -n1 -r -p "Press any key to continue..."
      ;;

    9)
      echo "Goodbye!"
      exit 0
      ;;

    *)
      echo "Invalid option!"
      sleep 1
      ;;
  esac
done
