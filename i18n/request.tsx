import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
import enMessages from '../messages/en.json';
import ruMessages from '../messages/ru.json';

const messages: Record<string, typeof enMessages> = {
  en: enMessages,
  ru: ruMessages,
};

export default getRequestConfig((params) => {
  const { locale } = params;
  
  if (locale !== 'en' && locale !== 'ru') {
    notFound();
  }

  return {
    locale,
    messages: messages[locale],
  };
});
