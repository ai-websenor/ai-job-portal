import {Controller} from '@nestjs/common';
import {ApplicationService} from '../application.service';

@Controller('applications')
export class ApplicationStatusController {
  constructor(private readonly applicationService: ApplicationService) {}

  // Future status update endpoints will go here
}
