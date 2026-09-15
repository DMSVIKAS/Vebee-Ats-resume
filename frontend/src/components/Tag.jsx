import React from 'react';
export default function Tag({ children, tone = 'default' }) {
  return <span className={`tag ${tone}`}>{children}</span>;
}
