import type { CreditService } from '../services/credit-service';

// The controller keeps the existing request contracts while using diagram service methods.
export class CreditController {
  constructor(private readonly service: CreditService) {}

  initCredits(request: Parameters<CreditService['initCredits']>[0]) {
    return this.service.initCredits(request);
  }

  reserveCredits(request: Parameters<CreditService['createReservation']>[0]) {
    return this.service.createReservation(request);
  }

  updateCredits(request: Parameters<CreditService['updateReservation']>[0]) {
    return this.service.updateReservation(request);
  }

  releaseCredits(request: Parameters<CreditService['releaseReservation']>[0]) {
    return this.service.releaseReservation(request);
  }

  transferCredits(request: Parameters<CreditService['transferReservation']>[0]) {
    return this.service.transferReservation(request);
  }

  getCreditBalance(request: Parameters<CreditService['displayCredit']>[0]) {
    return this.service.displayCredit(request);
  }

  getCreditHistory(request: Parameters<CreditService['displayUserHistory']>[0]) {
    return this.service.displayUserHistory(request);
  }
}
