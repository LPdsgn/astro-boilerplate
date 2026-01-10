// This file is NOT executed - it's just a visual template reference
// Copy the JSX here, then convert to html`` template in og.png.ts

export default function OGTemplate({ title, description }) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
				width: '100%',
				height: '100%',
				padding: '80px',
				background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
				fontFamily: 'Inter, sans-serif',
			}}
		>
			{/* Top bar with logo/brand */}
			<div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
				<div
					style={{
						width: '48px',
						height: '48px',
						background: '#fff',
						borderRadius: '12px',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						fontWeight: 700,
						fontSize: '24px',
						color: '#0a0a0a',
					}}
				>
					AB
				</div>
				<span style={{ color: '#666', fontSize: '24px' }}>Astro Boilerplate</span>
			</div>

			{/* Content */}
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: '24px',
					flex: 1,
					justifyContent: 'center',
				}}
			>
				<h1
					style={{
						color: '#ffffff',
						fontSize: '72px',
						fontWeight: 700,
						margin: 0,
						lineHeight: 1.1,
						maxWidth: '900px',
					}}
				>
					{title}
				</h1>

				<p
					style={{
						color: '#999',
						fontSize: '32px',
						margin: 0,
						lineHeight: 1.4,
						maxWidth: '800px',
					}}
				>
					{description}
				</p>
			</div>

			{/* Footer */}
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<span style={{ color: '#444', fontSize: '20px' }}>Powered by Astro</span>
				<span style={{ color: '#444', fontSize: '20px' }}>astro-boilerplate-new</span>
			</div>
		</div>
	);
}
