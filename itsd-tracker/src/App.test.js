import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

test('renders sample page content', () => {
  render(
    <MemoryRouter initialEntries={['/sample']}>
      <App />
    </MemoryRouter>
  );
  const contentElement = screen.getByText(/Sample Page Content/i);
  expect(contentElement).toBeInTheDocument();
});


