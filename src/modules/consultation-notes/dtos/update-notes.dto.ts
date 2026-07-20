import { PartialType } from '@nestjs/swagger';
import { CreateNotesDto } from './create-note.dto';

export class UpdateNotesDto extends PartialType(CreateNotesDto) {}