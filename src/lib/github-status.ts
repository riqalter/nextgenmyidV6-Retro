export function repositoryStatus(data: { status: 'complete' | 'partial' | 'stale' | 'unavailable'; source: 'network' | 'cache' }): string {
	if (data.status === 'stale') return 'GitHub refresh failed at build time. Showing the last complete saved snapshot.';
	if (data.status === 'partial') return 'Only some accounts were available at build time. This is a partial snapshot.';
	if (data.status === 'unavailable') return 'GitHub was unavailable at build time. The featured case studies are still available.';
	return data.source === 'cache' ? 'Complete saved snapshot, reused during this build.' : 'Complete snapshot fetched during this build.';
}
