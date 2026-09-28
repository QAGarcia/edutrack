import { Controller, Get, Injectable, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CertificateVerificationResponse } from '../../common/http/responses';
import { ApiErrors, E } from '../../common/http/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Public } from '../../common/auth/decorators';
import { NotFound } from '../../common/errors/app.exception';
import { Certificate } from './certificate.entity';

export function presentCertificate(c: Certificate) {
  return {
    code: c.code,
    studentName: c.studentName,
    courseTitle: c.courseTitle,
    teacherName: c.teacherName,
    workloadHours: c.workloadHours,
    finalAverage: c.finalAverage,
    issuedAt: c.issuedAt,
  };
}

@Injectable()
export class CertificatesService {
  constructor(@InjectRepository(Certificate) private readonly repo: Repository<Certificate>) {}

  async verify(code: string) {
    const cert = await this.repo.findOne({ where: { code: code.trim().toUpperCase() } });
    if (!cert) throw NotFound('Certificado');
    return { valid: true, ...presentCertificate(cert) };
  }
}

@ApiTags('Certificates')
@Controller('api/certificates')
export class CertificatesController {
  constructor(private readonly service: CertificatesService) {}

  @Public() @Get(':code')
  @ApiOperation({ summary: 'Verificação pública de autenticidade do certificado', description: 'RN54. Aceita o código em qualquer caixa.' })
  @ApiParam({ name: 'code', example: 'EDU-JOAO-PLAY' })
  @ApiOkResponse({ type: CertificateVerificationResponse })
  @ApiErrors(E.notFound('Certificado'))
  verify(@Param('code') code: string) {
    return this.service.verify(code);
  }
}
