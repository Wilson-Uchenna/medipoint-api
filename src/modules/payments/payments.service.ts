import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaystackProvider } from './provider/paystack.provider';
import {
  ConsultationStatus,
  NotificationType,
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from '../../generated/prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from 'src/core/email/email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private paystackProvider: PaystackProvider,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async initializePayment(
    patientUserId: string,
    consultationId: string,
    method: PaymentMethod,
    callbackUrl?: string,
  ) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: patientUserId },
      include: { user: { select: { email: true } } },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    const consultation = await this.prisma.consultation.findFirst({
      where: {
        id: consultationId,
        patientId: patient.id,
        status: ConsultationStatus.PENDING_PAYMENT,
      },
    });
    if (!consultation)
      throw new NotFoundException('Consultation not found or already paid');

    const reference = `MDP_${Date.now()}_${consultationId.slice(0, 8)}`;
    const amountInKobo = Math.round(Number(consultation.amount) * 100);

    const paystackResponse = await this.paystackProvider.initializeTransaction(
    patient.user.email,
    amountInKobo,
    reference,
    callbackUrl,
  );

    const payment = await this.prisma.payment.create({
      data: {
        consultationId,
        amount: consultation.amount,
        currency: consultation.currency,
        method,
        status: PaymentStatus.PENDING,
        reference,
        providerRef: paystackResponse.access_code,
      },
    });

    return { payment, authorizationUrl: paystackResponse.authorization_url };
  }

  async verifyPayment(reference: string, requestingUserId?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { reference },
      include: {
        consultation: {
          include: {
            patient: {
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    // Only the owning patient may trigger a manual verify check
    if (
      requestingUserId &&
      payment.consultation.patient.userId !== requestingUserId
    ) {
      throw new ForbiddenException('Not authorized to verify this payment');
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      return { message: 'Payment already verified', status: 'SUCCESS' };
    }

    const paystackData =
      await this.paystackProvider.verifyTransaction(reference);

    if (paystackData.status !== 'success') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failedAt: new Date(),
          failureReason: paystackData.gateway_response,
        },
      });
      return { message: 'Payment not successful', status: 'FAILED' };
    }

    // Amount mismatch check — never trust the reference alone
    const expectedKobo = Math.round(Number(payment.amount) * 100);
    if (paystackData.amount !== expectedKobo) {
      throw new BadRequestException('Payment amount mismatch');
    }

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.SUCCESS, paidAt: new Date() },
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

    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    const loginUrl = `${this.configService.get('ADMIN_URL')}/login`;

    await Promise.allSettled(
      admins.map(async (admin) => {
        await this.emailService.sendAdminPatientBookingNotification(
          admin.email,
          `${payment.consultation.patient.user.firstName} ${payment.consultation.patient.user.lastName}`,
          loginUrl,
          payment.consultationId,
        );
        await this.notificationsService.createNotification(
          admin.id,
          NotificationType.APPOINTMENT_BOOKING,
          'New paid booking needs provider assignment',
          `${payment.consultation.patient.user.firstName} ${payment.consultation.patient.user.lastName} booked and paid for a consultation.`,
          { consultationId: payment.consultationId },
        );
      }),
    );

    return { message: 'Payment verified successfully', status: 'SUCCESS' };
  }

  async handleWebhookEvent(payload: any) {
    if (payload.event !== 'charge.success') {
      return { received: true };
    }
    // Delegate to the same verify logic — webhook is the authoritative trigger
    await this.verifyPayment(payload.data.reference);
    return { received: true };
  }

  async getPaymentHistory(patientUserId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: patientUserId },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    return this.prisma.payment.findMany({
      where: { consultation: { patientId: patient.id } },
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
