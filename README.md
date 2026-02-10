# OnFutureV3

OnFuture Agency – Xaricdə təhsil, viza dəstəyi və peşəkar proqramlaşdırma kursları mərkəzi.

## Deployment with Traefik

This project is configured to be deployed using Docker and Traefik.

### Prerequisites
- Docker & Docker Compose
- Traefik running on an external network named `edge`

### Local Setup
```bash
node server.js
```
The server will be available at `http://localhost:6985`.

### Docker Deployment
```bash
docker compose up -d --build
```

### CI/CD Guidelines
- Ensure `logs.json` is mapped to a persistent volume.
- Update `traefik.http.routers.onfuture-web.rule` label if domain changes.

## New Features (v1.8.0)
- **Dynamic Navbar**: Loaded from `data/navbar.json` for consistent updates across all pages.
- **Smooth Page Transitions**: Implemented using **Barba.js** and **GSAP**.
    - **"Book-like" Slide Effect**: Pages slide horizontally (Right-to-Left) during navigation.
    - **Scoped Initialization**: Scripts re-initialize automatically after each transition to ensure interactivity (dropdowns, tabs, etc.) works seamlessly.
