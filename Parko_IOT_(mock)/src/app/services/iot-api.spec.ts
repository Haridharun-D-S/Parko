import { TestBed } from '@angular/core/testing';

import { IoTApi } from './iot-api';

describe('IotApi', () => {
  let service: IoTApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IoTApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
