"""Integration test: health endpoint."""


def test_health_check(client):
    """GET /health returns 200 with status=healthy."""
    resp = client.get('/health')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['status'] == 'healthy'
    assert data['service'] == 'smart-eval-api'
