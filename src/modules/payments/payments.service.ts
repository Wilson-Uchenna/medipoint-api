import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ConsultationStatus,
  PaymentMethod,
  PaymentStatus,
} from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async initializePayment(
    patientUserId: string,
    consultationId: string,
    method: PaymentMethod,
  ) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: patientUserId },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const consultation = await this.prisma.consultation.findFirst({
      where: {
        id: consultationId,
        patientId: patient.id,
        status: ConsultationStatus.PENDING_PAYMENT,
      },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found or already paid');
    }

    // Generate unique reference
    const reference = `MDP_${Date.now()}_${consultationId.slice(0, 8)}`;

    // Initialize with payment provider (Paystack/Stripe)
    // TODO: Integrate actual payment gateway

    const payment = await this.prisma.payment.create({
      data: {
        consultationId,
        amount: consultation.amount,
        currency: consultation.currency,
        method,
        status: PaymentStatus.PENDING,
        reference,
      },
    });

    return {
      payment,
      authorizationUrl: 'https://paystack.com/pay/placeholder', // TODO: Replace with actual URL
    };
  }

  async verifyPayment(reference: string) {
    // TODO: Verify with payment provider webhook/ API
    // This is called by webhook or manual verification

    const payment = await this.prisma.payment.findUnique({
      where: { reference },
      include: { consultation: true },
    });

    if (!payment) throw new NotFoundException('Payment not found');

    // Simulate successful verification
    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCESS,
          paidAt: new Date(),
        },
      }),
      this.prisma.consultation.update({
        where: { id: payment.consultationId },
        data: {
          status: ConsultationStatus.PAID,
          paymentStatus: PaymentStatus.SUCCESS,
          paidAt: new Date(),
        },
      }),
    ]);

    return { message: 'Payment verified successfully', status: 'SUCCESS' };
  }

  async handleWebhook(payload: any) {
    // TODO: Implement provider-specific webhook handling
    // Verify signature, update payment status
    return { received: true };
  }

  async getPaymentHistory(patientUserId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: patientUserId },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return this.prisma.payment.findMany({
      where: {
        consultation: {
          patientId: patient.id,
        },
      },
      include: {
        consultation: {
          include: {
            professional: {
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
