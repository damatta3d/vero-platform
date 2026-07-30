import { Controller, Get, Header } from '@nestjs/common';

import { veroDesignSystemCss } from '../ui/vero-design-system.assets.js';
import { financePageCss, financePageHtml, financePageJavaScript } from './finance-page.assets.js';

@Controller()
export class FinancePageController {
  @Get('finance')
  @Header('content-type', 'text/html; charset=utf-8')
  page(): string {
    return financePageHtml;
  }

  @Get('finance.css')
  @Header('content-type', 'text/css; charset=utf-8')
  css(): string {
    return `${veroDesignSystemCss}\n${financePageCss}`;
  }

  @Get('finance.js')
  @Header('content-type', 'application/javascript; charset=utf-8')
  script(): string {
    return financePageJavaScript;
  }
}
