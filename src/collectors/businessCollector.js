const { metrics } = require('../config/metrics');
const { loggers } = require('../utils/logger');
const logger = loggers.main;

class BusinessMetricsCollector {
  constructor() {
    this.businessData = {
      dailyReservations: 0,
      dailyRevenue: 0,
      activeUsers: new Set(),
      conversionFunnel: {
        pageViews: 0,
        eventViews: 0,
        cartAdds: 0,
        checkoutStarts: 0,
        paymentCompletes: 0
      }
    };
    
    this.resetInterval = null;
    this.setupDailyReset();
  }

  start() {
    logger.info('Starting business metrics collection...');
    this.updateMetrics();
  }

  stop() {
    if (this.resetInterval) {
      clearInterval(this.resetInterval);
      this.resetInterval = null;
    }
    logger.info('Business metrics collection stopped');
  }

  // Configuration du reset quotidien
  setupDailyReset() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.resetDailyMetrics();
      // Programmer le reset quotidien
      this.resetInterval = setInterval(() => {
        this.resetDailyMetrics();
      }, 24 * 60 * 60 * 1000); // 24 heures
    }, msUntilMidnight);
  }

  resetDailyMetrics() {
    logger.info('Resetting daily business metrics');
    this.businessData.dailyReservations = 0;
    this.businessData.dailyRevenue = 0;
    this.businessData.activeUsers.clear();
    this.businessData.conversionFunnel = {
      pageViews: 0,
      eventViews: 0,
      cartAdds: 0,
      checkoutStarts: 0,
      paymentCompletes: 0
    };
    this.updateMetrics();
  }

  // === MÉTRIQUES DE RÉSERVATION ===

  recordReservation(data) {
    const {
      status = 'pending',
      eventType = 'concert',
      paymentMethod = 'card',
      amount = 0,
      currency = 'EUR',
      userId,
      eventId,
      ticketType = 'standard',
      venue = 'unknown'
    } = data;

    try {
      // Incrémenter les compteurs de réservation
      metrics.reservations.labels(status, eventType, paymentMethod).inc();
      
      if (status === 'confirmed') {
        this.businessData.dailyReservations++;
        
        // Enregistrer le revenu
        if (amount > 0) {
          metrics.revenue.labels(currency, eventType, paymentMethod).inc(amount);
          this.businessData.dailyRevenue += amount;
        }
        
        // Enregistrer la vente de ticket
        metrics.ticketsSold.labels(eventId || 'unknown', ticketType, venue).inc();
      }
      
      // Marquer l'utilisateur comme actif
      if (userId) {
        this.businessData.activeUsers.add(userId);
      }
      
      this.updateMetrics();
      
      logger.debug(`Reservation recorded: ${status} - ${eventType} - ${amount}${currency}`);
      
    } catch (error) {
      logger.error('Error recording reservation metrics:', error);
    }
  }

  // === MÉTRIQUES D'UTILISATEURS ACTIFS ===

  recordUserActivity(userId, activityType = 'page_view') {
    try {
      if (userId) {
        this.businessData.activeUsers.add(userId);
      }
      
      // Mettre à jour le funnel de conversion
      switch (activityType) {
        case 'page_view':
          this.businessData.conversionFunnel.pageViews++;
          break;
        case 'event_view':
          this.businessData.conversionFunnel.eventViews++;
          break;
        case 'cart_add':
          this.businessData.conversionFunnel.cartAdds++;
          break;
        case 'checkout_start':
          this.businessData.conversionFunnel.checkoutStarts++;
          break;
        case 'payment_complete':
          this.businessData.conversionFunnel.paymentCompletes++;
          break;
      }
      
      this.updateConversionRates();
      this.updateMetrics();
      
    } catch (error) {
      logger.error('Error recording user activity:', error);
    }
  }

  // === MÉTRIQUES DE CONVERSION ===

  updateConversionRates() {
    const funnel = this.businessData.conversionFunnel;
    
    try {
      // Taux de conversion: page views -> event views
      if (funnel.pageViews > 0) {
        const eventViewRate = (funnel.eventViews / funnel.pageViews) * 100;
        metrics.conversionRate.labels('page_to_event', 'all').set(eventViewRate);
      }
      
      // Taux de conversion: event views -> cart adds
      if (funnel.eventViews > 0) {
        const cartRate = (funnel.cartAdds / funnel.eventViews) * 100;
        metrics.conversionRate.labels('event_to_cart', 'all').set(cartRate);
      }
      
      // Taux de conversion: cart adds -> checkout
      if (funnel.cartAdds > 0) {
        const checkoutRate = (funnel.checkoutStarts / funnel.cartAdds) * 100;
        metrics.conversionRate.labels('cart_to_checkout', 'all').set(checkoutRate);
      }
      
      // Taux de conversion: checkout -> payment
      if (funnel.checkoutStarts > 0) {
        const paymentRate = (funnel.paymentCompletes / funnel.checkoutStarts) * 100;
        metrics.conversionRate.labels('checkout_to_payment', 'all').set(paymentRate);
      }
      
      // Taux de conversion global
      if (funnel.pageViews > 0) {
        const globalRate = (funnel.paymentCompletes / funnel.pageViews) * 100;
        metrics.conversionRate.labels('global', 'all').set(globalRate);
      }
      
    } catch (error) {
      logger.error('Error updating conversion rates:', error);
    }
  }

  // === MÉTRIQUES DE REVENU ===

  recordRevenue(data) {
    const {
      amount,
      currency = 'EUR',
      eventType = 'concert',
      paymentMethod = 'card',
      refund = false
    } = data;

    try {
      if (refund) {
        // Remboursement (valeur négative)
        metrics.revenue.labels(currency, eventType, paymentMethod).inc(-Math.abs(amount));
        this.businessData.dailyRevenue -= Math.abs(amount);
      } else {
        // Paiement normal
        metrics.revenue.labels(currency, eventType, paymentMethod).inc(amount);
        this.businessData.dailyRevenue += amount;
      }
      
      this.updateMetrics();
      
      logger.debug(`Revenue recorded: ${refund ? '-' : ''}${amount}${currency}`);
      
    } catch (error) {
      logger.error('Error recording revenue metrics:', error);
    }
  }

  // === MÉTRIQUES PAR ÉVÉNEMENT ===

  recordEventMetrics(eventData) {
    const {
      eventId,
      eventType = 'concert',
      venue = 'unknown',
      ticketsAvailable = 0,
      ticketsSold = 0,
      revenue = 0,
      currency = 'EUR'
    } = eventData;

    try {
      // Métriques de tickets
      if (ticketsSold > 0) {
        metrics.ticketsSold.labels(eventId, 'all', venue).set(ticketsSold);
      }
      
      // Taux d'occupation
      if (ticketsAvailable > 0) {
        const occupancyRate = (ticketsSold / ticketsAvailable) * 100;
        metrics.conversionRate.labels('occupancy_rate', eventType).set(occupancyRate);
      }
      
      // Revenu par événement
      if (revenue > 0) {
        metrics.revenue.labels(currency, eventType, 'event_total').set(revenue);
      }
      
    } catch (error) {
      logger.error('Error recording event metrics:', error);
    }
  }

  // === MISE À JOUR DES MÉTRIQUES ===

  updateMetrics() {
    try {
      // Utilisateurs actifs
      metrics.activeUsers.labels('daily').set(this.businessData.activeUsers.size);
      
      // Calculer les utilisateurs actifs par période
      const now = Date.now();
      const activeUsers1h = this.calculateActiveUsers(60 * 60 * 1000); // 1 heure
      const activeUsers24h = this.businessData.activeUsers.size; // Déjà calculé
      
      metrics.activeUsers.labels('1h').set(activeUsers1h);
      metrics.activeUsers.labels('24h').set(activeUsers24h);
      
    } catch (error) {
      logger.error('Error updating business metrics:', error);
    }
  }

  // === MÉTHODES UTILITAIRES ===

  calculateActiveUsers(timeframe) {
    // Implémentation simplifiée - en production, vous utiliseriez probablement
    // une base de données avec timestamps pour calculer les utilisateurs actifs
    // par période
    return Math.floor(this.businessData.activeUsers.size * (timeframe / (24 * 60 * 60 * 1000)));
  }

  // Obtenir un résumé des métriques business
  getBusinessSummary() {
    const funnel = this.businessData.conversionFunnel;
    
    return {
      dailyStats: {
        reservations: this.businessData.dailyReservations,
        revenue: this.businessData.dailyRevenue,
        activeUsers: this.businessData.activeUsers.size
      },
      conversionFunnel: {
        ...funnel,
        rates: {
          pageToEvent: funnel.pageViews > 0 ? (funnel.eventViews / funnel.pageViews) * 100 : 0,
          eventToCart: funnel.eventViews > 0 ? (funnel.cartAdds / funnel.eventViews) * 100 : 0,
          cartToCheckout: funnel.cartAdds > 0 ? (funnel.checkoutStarts / funnel.cartAdds) * 100 : 0,
          checkoutToPayment: funnel.checkoutStarts > 0 ? (funnel.paymentCompletes / funnel.checkoutStarts) * 100 : 0,
          global: funnel.pageViews > 0 ? (funnel.paymentCompletes / funnel.pageViews) * 100 : 0
        }
      }
    };
  }

  // Méthodes pour l'API externe (webhooks, etc.)
  handleExternalEvent(eventType, data) {
    switch (eventType) {
      case 'reservation_created':
        this.recordReservation(data);
        break;
      case 'payment_completed':
        this.recordRevenue(data);
        break;
      case 'user_activity':
        this.recordUserActivity(data.userId, data.activityType);
        break;
      case 'event_updated':
        this.recordEventMetrics(data);
        break;
      default:
        logger.warn(`Unknown external event type: ${eventType}`);
    }
  }
}

module.exports = BusinessMetricsCollector;
