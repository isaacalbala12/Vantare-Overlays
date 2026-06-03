import type { Meta, StoryObj } from '@storybook/react';
import '../animations.css';

const meta: Meta = {
  title: 'Design/Animations',
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'dark' },
  },
};

export default meta;
type Story = StoryObj;

function AnimationDemo({ className, label }: { className: string; label: string }) {
  return (
    <div style={{ padding: '1rem' }}>
      <div
        className={className}
        style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '1rem',
          borderRadius: '0.5rem',
          minWidth: '200px',
          textAlign: 'center',
        }}
      >
        {label}
      </div>
    </div>
  );
}

export const AllAnimations: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1rem',
      }}
    >
      <AnimationDemo className="hf-fade-in" label="hf-fade-in" />
      <AnimationDemo className="hf-fade-out" label="hf-fade-out" />
      <AnimationDemo className="hf-slide-up" label="hf-slide-up" />
      <AnimationDemo className="hf-slide-down" label="hf-slide-down" />
      <AnimationDemo className="hf-pulse" label="hf-pulse" />
      <AnimationDemo className="hf-glow" label="hf-glow" />
      <AnimationDemo className="hf-scale-in" label="hf-scale-in" />
    </div>
  ),
};
